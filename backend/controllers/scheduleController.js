const Schedule = require('../models/Schedule');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
exports.getSchedules = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Filter options
  let query = {};
  
  // Filter by class
  if (req.query.class) {
    query.class = req.query.class;
  }
  
  // Filter by grade
  if (req.query.grade) {
    query.grade = req.query.grade;
  }
  
  // Filter by day of week
  if (req.query.dayOfWeek) {
    query.dayOfWeek = req.query.dayOfWeek;
  }
  
  // Filter by room
  if (req.query.room) {
    query.room = req.query.room;
  }
  
  // Filter by teacher
  if (req.query.teacher) {
    query.teacher = req.query.teacher;
  }
  
  // Filter by subject
  if (req.query.subject) {
    query.subject = req.query.subject;
  }
  
  // Filter by active status
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  }

  // Fetch schedules with populated fields
  const schedules = await Schedule.find(query)
    .populate('subject', 'name code')
    .populate('teacher', 'name email role')
    .populate('room', 'name building floor')
    .sort({ dayOfWeek: 1, startTime: 1 })
    .skip(startIndex)
    .limit(limit);

  // Get total count
  const total = await Schedule.countDocuments(query);

  res.status(200).json({
    success: true,
    count: schedules.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: schedules
  });
});

// @desc    Get single schedule
// @route   GET /api/schedules/:id
// @access  Private
exports.getSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id)
    .populate('subject', 'name code description')
    .populate('teacher', 'name email role')
    .populate('room', 'name building floor capacity');

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  res.status(200).json({
    success: true,
    data: schedule
  });
});

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private/Admin
exports.createSchedule = asyncHandler(async (req, res) => {
  const { subject, teacher, room, class: className, grade, dayOfWeek, startTime, endTime } = req.body;

  // Validate required fields
  if (!subject || !teacher || !room || !className || !grade || !dayOfWeek || !startTime || !endTime) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Validate that subject, teacher, and room exist
  const subjectExists = await Subject.findById(subject);
  if (!subjectExists) {
    res.status(404);
    throw new Error('Subject not found');
  }

  const teacherExists = await User.findById(teacher);
  if (!teacherExists || teacherExists.role !== 'teacher') {
    res.status(404);
    throw new Error('Teacher not found');
  }

  const roomExists = await Room.findById(room);
  if (!roomExists) {
    res.status(404);
    throw new Error('Room not found');
  }

  // Check for time conflicts in the same room
  const conflictingSchedule = await Schedule.findOne({
    room,
    dayOfWeek,
    isActive: true,
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });

  if (conflictingSchedule) {
    res.status(400);
    throw new Error('Time conflict: Room is already booked for this time slot');
  }

  // Check for teacher conflicts
  const teacherConflict = await Schedule.findOne({
    teacher,
    dayOfWeek,
    isActive: true,
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });

  if (teacherConflict) {
    res.status(400);
    throw new Error('Time conflict: Teacher is already assigned to another class at this time');
  }

  // Check for class conflicts
  const classConflict = await Schedule.findOne({
    class: className,
    grade,
    dayOfWeek,
    isActive: true,
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });

  if (classConflict) {
    res.status(400);
    throw new Error('Time conflict: Class already has a lesson scheduled at this time');
  }

  // Create schedule
  const schedule = await Schedule.create({
    subject,
    teacher,
    room,
    class: className,
    grade,
    dayOfWeek,
    startTime,
    endTime
  });

  // Populate the created schedule
  const populatedSchedule = await Schedule.findById(schedule._id)
    .populate('subject', 'name code')
    .populate('teacher', 'name email role')
    .populate('room', 'name building floor');

  res.status(201).json({
    success: true,
    data: populatedSchedule
  });
});

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private/Admin
exports.updateSchedule = asyncHandler(async (req, res) => {
  let schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  const { subject, teacher, room, class: className, grade, dayOfWeek, startTime, endTime, isActive } = req.body;

  // If updating time-related fields, check for conflicts
  if (dayOfWeek || startTime || endTime || room || teacher || className || grade) {
    const updateData = {
      room: room || schedule.room,
      dayOfWeek: dayOfWeek || schedule.dayOfWeek,
      startTime: startTime || schedule.startTime,
      endTime: endTime || schedule.endTime,
      teacher: teacher || schedule.teacher,
      class: className || schedule.class,
      grade: grade || schedule.grade
    };

    // Check for room conflicts (excluding current schedule)
    const conflictingSchedule = await Schedule.findOne({
      _id: { $ne: req.params.id },
      room: updateData.room,
      dayOfWeek: updateData.dayOfWeek,
      isActive: true,
      $or: [
        {
          startTime: { $lt: updateData.endTime },
          endTime: { $gt: updateData.startTime }
        }
      ]
    });

    if (conflictingSchedule) {
      res.status(400);
      throw new Error('Time conflict: Room is already booked for this time slot');
    }

    // Check for teacher conflicts (excluding current schedule)
    const teacherConflict = await Schedule.findOne({
      _id: { $ne: req.params.id },
      teacher: updateData.teacher,
      dayOfWeek: updateData.dayOfWeek,
      isActive: true,
      $or: [
        {
          startTime: { $lt: updateData.endTime },
          endTime: { $gt: updateData.startTime }
        }
      ]
    });

    if (teacherConflict) {
      res.status(400);
      throw new Error('Time conflict: Teacher is already assigned to another class at this time');
    }

    // Check for class conflicts (excluding current schedule)
    const classConflict = await Schedule.findOne({
      _id: { $ne: req.params.id },
      class: updateData.class,
      grade: updateData.grade,
      dayOfWeek: updateData.dayOfWeek,
      isActive: true,
      $or: [
        {
          startTime: { $lt: updateData.endTime },
          endTime: { $gt: updateData.startTime }
        }
      ]
    });

    if (classConflict) {
      res.status(400);
      throw new Error('Time conflict: Class already has a lesson scheduled at this time');
    }
  }

  // Update schedule
  schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('subject', 'name code')
   .populate('teacher', 'name email role')
   .populate('room', 'name building floor');

  res.status(200).json({
    success: true,
    data: schedule
  });
});

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
exports.deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  await Schedule.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get schedules by class and grade
// @route   GET /api/schedules/class/:class/grade/:grade
// @access  Private
exports.getSchedulesByClass = asyncHandler(async (req, res) => {
  const { class: className, grade } = req.params;
  const { dayOfWeek } = req.query;

  let query = {
    class: className,
    grade: grade,
    isActive: true
  };

  if (dayOfWeek) {
    query.dayOfWeek = dayOfWeek;
  }

  const schedules = await Schedule.find(query)
    .populate('subject', 'name code')
    .populate('teacher', 'name email role')
    .populate('room', 'name building floor')
    .sort({ dayOfWeek: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    count: schedules.length,
    data: schedules
  });
});

// @desc    Get schedules by room
// @route   GET /api/schedules/room/:roomId
// @access  Private
exports.getSchedulesByRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { dayOfWeek } = req.query;

  let query = {
    room: roomId,
    isActive: true
  };

  if (dayOfWeek) {
    query.dayOfWeek = dayOfWeek;
  }

  const schedules = await Schedule.find(query)
    .populate('subject', 'name code')
    .populate('teacher', 'name email role')
    .sort({ dayOfWeek: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    count: schedules.length,
    data: schedules
  });
});