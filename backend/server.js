const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import security middleware
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validation');
const { errorHandler, requestLogger, notFound } = require('./middleware/errorHandler');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const userRoutes = require('./routes/userRoutes');
const otaRoutes = require('./routes/otaRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const roomRoutes = require('./routes/roomRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(generalLimiter); // Apply rate limiting to all requests
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput); // Sanitize all input
// Simplified CORS configuration for development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : [
        'http://localhost:3000', 
        'http://localhost:5050',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5050'
      ];
  
  // Set CORS headers
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});
app.use(morgan('combined')); // More detailed logging
app.use(requestLogger); // Custom request logging

// Route logging middleware for debugging
app.use((req, res, next) => {
  console.log(`Route accessed: ${req.method} ${req.url}`);
  next();
});

// Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes); // Apply stricter rate limiting to auth routes
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ota', otaRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/schedules', scheduleRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to School Attendance System API' });
});

// Import additional routes
const systemRoutes = require('./routes/systemRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

// Use additional routes
app.use('/api/system', systemRoutes);
app.use('/api/devices', deviceRoutes);

// Error handling middleware (must be last)
app.use(notFound); // Handle 404 errors
app.use(errorHandler); // Handle all other errors

// Get local IP address to display in the console
const getLocalIpAddress = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  
  // Find the first IPv4 non-internal address
  for (const name of Object.keys(results)) {
    if (results[name].length > 0) {
      return results[name][0];
    }
  }
  
  return 'localhost'; // Fallback to localhost
};

// Start server - listen on all network interfaces
const PORT = process.env.PORT || 5050;
const HOST = process.env.HOST || '0.0.0.0';
const localIp = getLocalIpAddress();

app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Local:            http://localhost:${PORT}`);
  console.log(`On Your Network:  http://${localIp}:${PORT}`);
});

module.exports = app;
