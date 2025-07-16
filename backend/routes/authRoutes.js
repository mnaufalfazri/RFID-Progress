const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateEmail, validatePassword, validateRequired } = require('../middleware/validation');

const router = express.Router();

router.post('/register', 
  validateRequired(['name', 'email', 'password']),
  validateEmail,
  validatePassword,
  register
);

router.post('/login', 
  validateRequired(['email', 'password']),
  validateEmail,
  login
);
router.get('/me', protect, getMe);

module.exports = router;
