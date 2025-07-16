const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security event logger
exports.logSecurityEvent = (event, req, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user ? req.user._id : null,
    details
  };
  
  const logFile = path.join(logsDir, 'security.log');
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔒 Security Event:', logEntry);
  }
};

// Enhanced error handler middleware
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  console.error('Error:', err);
  
  // Log security-related errors
  if (err.name === 'UnauthorizedError' || err.statusCode === 401 || err.statusCode === 403) {
    exports.logSecurityEvent('UNAUTHORIZED_ACCESS', req, {
      error: err.message,
      statusCode: err.statusCode
    });
  }

  // Handle specific application errors with proper status codes
  if (err.message && typeof err.message === 'string') {
    // Attendance-related errors
    if (err.message.includes('already marked present') || 
        err.message.includes('already has complete attendance')) {
      error = { statusCode: 409, message: err.message };
    }
    // Resource not found errors
    else if (err.message.includes('not found') || 
             err.message.includes('No active lesson found')) {
      error = { statusCode: 404, message: err.message };
    }
    // Validation/business logic errors
    else if (err.message.includes('Please provide') ||
             err.message.includes('Invalid') ||
             err.message.includes('inactive') ||
             err.message.includes('not registered')) {
      error = { statusCode: 400, message: err.message };
    }
    // Authorization errors
    else if (err.message.includes('Not authorized') ||
             err.message.includes('Access denied')) {
      error = { statusCode: 403, message: err.message };
    }
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { statusCode: 404, message };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { statusCode: 400, message };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { statusCode: 400, message };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { statusCode: 401, message };
    exports.logSecurityEvent('INVALID_TOKEN', req, { error: err.message });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { statusCode: 401, message };
    exports.logSecurityEvent('EXPIRED_TOKEN', req, { error: err.message });
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default to 500 only for truly unexpected errors
  const statusCode = error.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(statusCode === 409 && { code: 'CONFLICT' }),
    ...(statusCode === 422 && { code: 'UNPROCESSABLE_ENTITY' }),
    ...(isDevelopment && { stack: err.stack })
  });
};

// Request logger middleware
exports.requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log the request
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : null
  };
  
  // Override res.end to log response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    logEntry.statusCode = res.statusCode;
    logEntry.duration = duration;
    
    // Log to file
    const logFile = path.join(logsDir, 'requests.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    
    // Log suspicious activity
    if (res.statusCode >= 400) {
      exports.logSecurityEvent('HTTP_ERROR', req, {
        statusCode: res.statusCode,
        duration
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Not found handler
exports.notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};