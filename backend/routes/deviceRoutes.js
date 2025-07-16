const express = require('express');
const {
  registerDevice,
  getDevices,
  getDevice,
  getDeviceByDeviceId,
  updateDevice,
  deleteDevice,
  deviceHeartbeat,
  deviceConnect
} = require('../controllers/deviceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes (no auth required)
router.post('/heartbeat', deviceHeartbeat);
router.post('/connect', deviceConnect);
router.get('/device/:deviceId', getDeviceByDeviceId);

// Apply auth middleware to remaining routes
router.use(protect);

// Routes accessible by admin and staff only
router.get('/', authorize('admin', 'staff'), getDevices);
router.get('/:deviceId', authorize('admin', 'staff'), getDevice);

// Routes that need admin authorization
router.post('/register', authorize('admin'), registerDevice);
router.put('/:deviceId', authorize('admin'), updateDevice);
router.delete('/:deviceId', authorize('admin'), deleteDevice);

module.exports = router;
