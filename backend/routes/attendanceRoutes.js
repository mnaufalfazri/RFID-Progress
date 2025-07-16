const express = require('express');
const {
  recordAttendance,
  getAttendanceRecords,
  getAttendanceReport,
  addAttendanceRecord,
  updateAttendanceRecord,
  getLessonAttendanceRecords,
  getLessonAttendanceReport
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { deviceHeartbeat } = require('../controllers/deviceController');
const { rfidLimiter, heartbeatLimiter } = require('../middleware/rateLimiter');
const { validateRFID, validateDeviceId, validateRequired } = require('../middleware/validation');

const router = express.Router();

// Special public route for device heartbeat (no auth required)
router.post('/device/heartbeat', 
  heartbeatLimiter,
  validateRequired(['deviceId']),
  validateDeviceId,
  deviceHeartbeat
);

// Public route for ESP32 RFID scanner
router.post('/scan', 
  rfidLimiter,
  validateRequired(['rfidTag', 'deviceId']),
  validateRFID,
  validateDeviceId,
  recordAttendance
);

// Protected routes
router.use(protect);

// Routes for all authenticated users
router.get('/', getAttendanceRecords);
router.get('/report', getAttendanceReport);

// Lesson attendance routes
router.get('/lessons', getLessonAttendanceRecords);
router.get('/lessons/report', getLessonAttendanceReport);

// Routes for admin and teachers
router.post('/', authorize('admin', 'teacher'), addAttendanceRecord);
router.put('/:id', authorize('admin', 'teacher'), updateAttendanceRecord);

module.exports = router;
