const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private (Admin, Teacher)
exports.getRooms = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const search = req.query.search;

  let query = { active: true };

  // Add search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { building: { $regex: search, $options: 'i' } }
    ];
  }

  const rooms = await Room.find(query)
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);

  const total = await Room.countDocuments(query);

  res.status(200).json({
    success: true,
    count: rooms.length,
    total,
    data: rooms
  });
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private (Admin, Teacher)
exports.getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('createdBy', 'name');

  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room not found'
    });
  }

  res.status(200).json({
    success: true,
    data: room
  });
});

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private (Admin only)
exports.createRoom = asyncHandler(async (req, res) => {
  // Add createdBy field
  req.body.createdBy = req.user.id;

  const room = await Room.create(req.body);

  res.status(201).json({
    success: true,
    data: room
  });
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Admin only)
exports.updateRoom = asyncHandler(async (req, res) => {
  let room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room not found'
    });
  }

  room = await Room.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: room
  });
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Admin only)
exports.deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room not found'
    });
  }

  // Soft delete - set active to false
  await Room.findByIdAndUpdate(req.params.id, { active: false });

  res.status(200).json({
    success: true,
    data: {}
  });
});