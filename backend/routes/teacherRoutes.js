const express = require('express');
const {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher
} = require('../controllers/teacherController');

const { protect, authorize } = require('../middleware/auth');
const { validateEmail, validatePassword, validateRequired } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getTeachers)
  .post(
    validateRequired(['name', 'email', 'password']),
    validateEmail,
    validatePassword,
    createTeacher
  );

router.route('/:id')
  .get(getTeacher)
  .put(
    validateRequired(['name', 'email']),
    validateEmail,
    updateTeacher
  )
  .delete(deleteTeacher);

module.exports = router;