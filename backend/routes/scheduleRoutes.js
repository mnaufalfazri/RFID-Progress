const express = require('express');
const {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesByClass,
  getSchedulesByRoom
} = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.use(protect);

// General schedule routes
router.route('/')
  .get(getSchedules)
  .post(authorize('admin'), createSchedule);

router.route('/:id')
  .get(getSchedule)
  .put(authorize('admin'), updateSchedule)
  .delete(authorize('admin'), deleteSchedule);

// Specific query routes
router.get('/class/:class/grade/:grade', getSchedulesByClass);
router.get('/room/:roomId', getSchedulesByRoom);

module.exports = router;