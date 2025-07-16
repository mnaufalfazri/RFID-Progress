const express = require('express');
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectToStudent,
  removeSubjectAssignment,
  getSubjectStudents,
  getStudentSubjects
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Routes accessible by admin and teacher
router.route('/')
  .get(authorize('admin', 'teacher'), getSubjects)
  .post(authorize('admin'), createSubject); // Only admin can create subjects

router.route('/:id')
  .get(authorize('admin', 'teacher'), getSubject)
  .put(authorize('admin'), updateSubject) // Only admin can update subjects
  .delete(authorize('admin'), deleteSubject); // Only admin can delete subjects

// Subject assignment routes
router.route('/:id/assign')
  .post(authorize('admin', 'teacher'), assignSubjectToStudent); // Admin and teacher can assign

router.route('/:id/assign/:studentId')
  .delete(authorize('admin', 'teacher'), removeSubjectAssignment); // Admin and teacher can remove assignment

// Get students assigned to a subject
router.route('/:id/students')
  .get(authorize('admin', 'teacher'), getSubjectStudents);

module.exports = router;