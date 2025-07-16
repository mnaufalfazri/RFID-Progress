const express = require('express');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentByRfid,
  getStudentAttendance,
  getLastRfidTag,
  storeRfidTag
} = require('../controllers/studentController');
const { getStudentSubjects } = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes (no auth required) - for ESP32 devices
router.route('/store-rfid').post(storeRfidTag);
router.route('/last-rfid').get(getLastRfidTag);

// Apply auth middleware to all other routes
router.use(protect);

// Routes that need admin authorization
router.post('/', authorize('admin', 'teacher'), createStudent);
router.put('/:id', authorize('admin', 'teacher'), updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);

// Routes accessible by all authenticated users
router.get('/', getStudents);
router.get('/:id', getStudent);
router.get('/rfid/:tag', getStudentByRfid);
router.get('/:id/subjects', authorize('admin', 'teacher'), getStudentSubjects);

module.exports = router;
