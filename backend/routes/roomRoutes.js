const express = require('express');
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes accessible by admin, teacher, and staff
router.route('/')
  .get(authorize('admin', 'teacher', 'staff'), getRooms)
  .post(authorize('admin'), createRoom);

router.route('/:id')
  .get(authorize('admin', 'teacher', 'staff'), getRoom)
  .put(authorize('admin'), updateRoom)
  .delete(authorize('admin'), deleteRoom);

module.exports = router;