const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private (Admin)
exports.getTeachers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const search = req.query.search;

  let query = { role: 'teacher' };

  // Add search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const teachers = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: teachers.length,
    total,
    data: teachers
  });
});

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Private (Admin)
exports.getTeacher = asyncHandler(async (req, res) => {
  const teacher = await User.findById(req.params.id).select('-password');

  if (!teacher || teacher.role !== 'teacher') {
    return res.status(404).json({
      success: false,
      error: 'Teacher not found'
    });
  }

  res.status(200).json({
    success: true,
    data: teacher
  });
});

// @desc    Create new teacher
// @route   POST /api/teachers
// @access  Private (Admin only)
exports.createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password, phone, employeeId, department, specialization } = req.body;

  // Check if teacher already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Teacher with this email already exists'
    });
  }

  // Check if employeeId already exists (if provided)
  if (employeeId) {
    const existingEmployee = await User.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: 'Teacher with this employee ID already exists'
      });
    }
  }

  // Create teacher with role 'teacher'
  const teacher = await User.create({
    name,
    email,
    password,
    role: 'teacher',
    phone,
    employeeId,
    department,
    specialization
  });

  // Remove password from response
  teacher.password = undefined;

  res.status(201).json({
    success: true,
    data: teacher
  });
});

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private (Admin only)
exports.updateTeacher = asyncHandler(async (req, res) => {
  let teacher = await User.findById(req.params.id);

  if (!teacher || teacher.role !== 'teacher') {
    return res.status(404).json({
      success: false,
      error: 'Teacher not found'
    });
  }

  // Don't allow role change
  if (req.body.role && req.body.role !== 'teacher') {
    return res.status(400).json({
      success: false,
      error: 'Cannot change teacher role'
    });
  }

  // Check if email already exists (if being changed)
  if (req.body.email && req.body.email !== teacher.email) {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Teacher with this email already exists'
      });
    }
  }

  // Check if employeeId already exists (if being changed)
  if (req.body.employeeId && req.body.employeeId !== teacher.employeeId) {
    const existingEmployee = await User.findOne({ employeeId: req.body.employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: 'Teacher with this employee ID already exists'
      });
    }
  }

  // Hash password if provided
  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
  }

  teacher = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');

  res.status(200).json({
    success: true,
    data: teacher
  });
});

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private (Admin only)
exports.deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await User.findById(req.params.id);

  if (!teacher || teacher.role !== 'teacher') {
    return res.status(404).json({
      success: false,
      error: 'Teacher not found'
    });
  }

  // Check if teacher is assigned to any subjects
  const Subject = require('../models/Subject');
  const assignedSubjects = await Subject.countDocuments({ teacher: req.params.id, active: true });
  
  if (assignedSubjects > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete teacher who is assigned to subjects. Please reassign subjects first.'
    });
  }

  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});