const Student = require('../models/Student');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { getCurrentTime } = require('../utils/timezone');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
exports.getStudents = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Filter
  let query = {};
  
  if (req.query.class) {
    query.class = req.query.class;
  }
  
  if (req.query.grade) {
    query.grade = req.query.grade;
  }
  
  if (req.query.active) {
    query.active = req.query.active === 'true';
  }
  
  // Search
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { studentId: { $regex: req.query.search, $options: 'i' } },
      { rfidTag: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // Fetch students
  const students = await Student.find(query)
    .populate('user', '-password')
    .sort({ name: 1 })
    .skip(startIndex)
    .limit(limit);

  // Get total count
  const total = await Student.countDocuments(query);

  res.status(200).json({
    success: true,
    count: students.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: students
  });
});

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('user', '-password');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  res.status(200).json({
    success: true,
    data: student
  });
});

// @desc    Create new student
// @route   POST /api/students
// @access  Private/Admin
exports.createStudent = asyncHandler(async (req, res) => {
  // Check if student with same RFID tag exists
  const existingStudent = await Student.findOne({ rfidTag: req.body.rfidTag });
  
  if (existingStudent) {
    res.status(400);
    throw new Error('Student with this RFID tag already exists');
  }

  // Check if student ID already exists
  const existingStudentId = await Student.findOne({ studentId: req.body.studentId });
  
  if (existingStudentId) {
    res.status(400);
    throw new Error('Student with this ID already exists');
  }

  let user = null;
  
  // Create user account if email and password are provided
  if (req.body.email && req.body.password) {
    // Check if user with email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      res.status(400);
      throw new Error('User with this email already exists');
    }

    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: 'student'
    });
  }
  
  // Create student with user reference
  const studentData = {
    ...req.body,
    user: user ? user._id : null
  };
  
  const student = await Student.create(studentData);

  res.status(201).json({
    success: true,
    data: student
  });
});

// @desc    Get last detected RFID tag
// @route   GET /api/students/last-rfid
// @access  Private
exports.getLastRfidTag = asyncHandler(async (req, res) => {
  // Get the last RFID tag from global variable or cache
  if (!global.lastDetectedRfid) {
    res.status(404);
    throw new Error('No RFID tag has been detected recently');
  }

  res.status(200).json({
    success: true,
    data: {
      rfidTag: global.lastDetectedRfid,
      detectedAt: global.lastDetectedRfidTime
    }
  });
});

// @desc    Store last detected RFID tag
// @route   POST /api/students/store-rfid
// @access  Public (from ESP32 device)
exports.storeRfidTag = asyncHandler(async (req, res) => {
  const { rfidTag, deviceId } = req.body;

  if (!rfidTag || !deviceId) {
    res.status(400);
    throw new Error('Please provide both RFID tag and device ID');
  }

  // Store in global variable for simplicity
  // In production, consider using Redis or another caching solution
  global.lastDetectedRfid = rfidTag;
  global.lastDetectedRfidTime = getCurrentTime();

  res.status(200).json({
    success: true,
    message: 'RFID tag stored successfully'
  });
});

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private/Admin
exports.updateStudent = asyncHandler(async (req, res) => {
  let student = await Student.findById(req.params.id).populate('user');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check if updating RFID tag and if it's already in use
  if (req.body.rfidTag && req.body.rfidTag !== student.rfidTag) {
    const existingTagStudent = await Student.findOne({ rfidTag: req.body.rfidTag });
    
    if (existingTagStudent) {
      res.status(400);
      throw new Error('This RFID tag is already assigned to another student');
    }
  }

  // Check if updating student ID and if it's already in use
  if (req.body.studentId && req.body.studentId !== student.studentId) {
    const existingStudentId = await Student.findOne({ studentId: req.body.studentId });
    
    if (existingStudentId) {
      res.status(400);
      throw new Error('This student ID is already in use');
    }
  }

  // Handle user account creation/update
  if (req.body.email && req.body.password) {
    if (student.user) {
      // Update existing user account
      const updateData = {
        name: req.body.name || student.name,
        email: req.body.email
      };
      
      if (req.body.password) {
        updateData.password = req.body.password;
      }
      
      await User.findByIdAndUpdate(student.user._id, updateData, {
        new: true,
        runValidators: true
      });
    } else {
      // Create new user account
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        res.status(400);
        throw new Error('User with this email already exists');
      }

      const user = await User.create({
        name: req.body.name || student.name,
        email: req.body.email,
        password: req.body.password,
        role: 'student'
      });
      
      req.body.user = user._id;
    }
  } else if (req.body.email && student.user) {
    // Update email only
    await User.findByIdAndUpdate(student.user._id, {
      email: req.body.email,
      name: req.body.name || student.name
    });
  }

  // Update student
  student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('user', '-password');

  res.status(200).json({
    success: true,
    data: student
  });
});

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private/Admin
exports.deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('user');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Delete associated user account if exists
  if (student.user) {
    await User.findByIdAndDelete(student.user._id);
  }

  await Student.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get student by RFID tag
// @route   GET /api/students/rfid/:tag
// @access  Private
exports.getStudentByRfid = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ rfidTag: req.params.tag });

  if (!student) {
    res.status(404);
    throw new Error('Student not found with this RFID tag');
  }

  res.status(200).json({
    success: true,
    data: student
  });
});
