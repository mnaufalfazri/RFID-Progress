const Attendance = require('../models/Attendance');
const LessonAttendance = require('../models/LessonAttendance');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const Device = require('../models/deviceModel');
const asyncHandler = require('express-async-handler');
const { getCurrentTime, toJakartaTime, getStartOfDay, getEndOfDay, getNextDay } = require('../utils/timezone');

// @desc    Record attendance via RFID scan
// @route   POST /api/attendance/scan
// @access  Public (will be accessed from ESP32)
exports.recordAttendance = asyncHandler(async (req, res) => {
  const { rfidTag, deviceId, timestamp, status, location } = req.body;

  if (!rfidTag || !deviceId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both RFID tag and device ID'
    });
  }

  // Use timestamp from ESP32 if provided, otherwise use current time
  let scanTime;
  if (timestamp) {
    const espTime = new Date(timestamp);
    espTime.setHours(espTime.getHours() + 7); // Add 7 hours for Jakarta timezone
    scanTime = espTime;
  } else {
    scanTime = getCurrentTime();
  }

  // Log the received data for debugging
  console.log('Received attendance data:', {
    rfidTag,
    deviceId,
    timestamp,
    status,
    location,
    scanTime: scanTime.toISOString()
  });
  
  // Check device security status
  if (status === 'TAMPERED') {
    console.warn(`Security alert: Device ${deviceId} reported tampered status`);
  }

  try {
    // Find device to get location info
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found or not registered'
      });
    }

    // Check if device is properly configured and active
    if (!device.location || device.status === 'OFFLINE') {
      return res.status(400).json({
        success: false,
        error: 'Device is not registered or inactive'
      });
    }

    // Find student by RFID tag
    const student = await Student.findOne({ rfidTag });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found with this RFID tag'
      });
    }

    // Check if student is active
    if (!student.active) {
      return res.status(400).json({
        success: false,
        error: 'Student account is inactive'
      });
    }

    const today = getStartOfDay(scanTime);
    let result;

    if (device.location === 'ENTRANCE_GATE') {
      // Handle entrance gate attendance - mark present for all lessons today
      result = await handleEntranceGateAttendance(student, scanTime, deviceId, status, today);
    } else if (device.location === 'CLASSROOM') {
      // Handle classroom attendance - mark present for current lesson
      result = await handleClassroomAttendance(student, scanTime, deviceId, status, device.room, today);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid device location'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          studentId: student.studentId,
          class: student.class,
          grade: student.grade
        },
        ...result
      },
      message: result.message
    });

  } catch (error) {
    console.error('Attendance recording error:', error.message);
    
    // Handle specific error cases with appropriate status codes
    if (error.message.includes('already marked present')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'ALREADY_PRESENT'
      });
    }
    
    if (error.message.includes('already has complete attendance')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'ATTENDANCE_COMPLETE'
      });
    }
    
    if (error.message.includes('No active lesson found')) {
      return res.status(422).json({
        success: false,
        error: error.message,
        code: 'NO_ACTIVE_LESSON'
      });
    }
    
    // Generic server error for unexpected issues
    return res.status(500).json({
      success: false,
      error: 'Internal server error occurred while processing attendance',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Helper function to handle entrance gate attendance
const handleEntranceGateAttendance = async (student, scanTime, deviceId, status, today) => {
  // Check if daily attendance already exists
  const existingAttendance = await Attendance.findOne({
    student: student._id,
    date: { $gte: today, $lt: getNextDay(today) }
  });

  let attendance;

  if (existingAttendance) {
    // If student already has entry time, record exit time
    if (existingAttendance.entryTime && !existingAttendance.exitTime) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        { 
          exitTime: scanTime,
          device: deviceId,
          securityStatus: status || 'SECURE'
        },
        { new: true }
      );
      return {
        attendance,
        message: 'Exit time recorded - student marked present for all lessons today'
      };
    } else if (existingAttendance.exitTime) {
      throw new Error('Student already has complete attendance record for today');
    }
  } else {
    // Create new daily attendance record
    attendance = await Attendance.create({
      student: student._id,
      entryTime: scanTime,
      device: deviceId,
      securityStatus: status || 'SECURE',
      location: 'ENTRANCE_GATE',
      date: today
    });

    // Mark student present for all lessons today (only for new lessons)
    await markPresentForAllLessonsToday(student, today, deviceId, scanTime, status);

    return {
      attendance,
      message: 'Entry recorded - student marked present for all lessons today'
    };
  }
};

// Helper function to handle classroom attendance
const handleClassroomAttendance = async (student, scanTime, deviceId, status, roomId, today) => {
  // Find current lesson in this room
  const currentLesson = await getCurrentLesson(roomId, scanTime, student.class, student.grade, student._id);
  
  if (!currentLesson) {
    throw new Error('No active lesson found for this room and time - student may be in wrong classroom or not assigned to this subject');
  }

  // Check if lesson attendance already exists
  const existingLessonAttendance = await LessonAttendance.findOne({
    student: student._id,
    schedule: currentLesson._id,
    date: today
  });

  if (existingLessonAttendance) {
    throw new Error('Student already marked present for this lesson');
  }

  // Create lesson attendance record
  const lessonAttendance = await LessonAttendance.create({
    student: student._id,
    schedule: currentLesson._id,
    subject: currentLesson.subject,
    room: currentLesson.room,
    date: today,
    scanTime: scanTime,
    device: deviceId,
    securityStatus: status || 'SECURE'
  });

  return {
    lessonAttendance,
    lesson: currentLesson,
    message: `Attendance recorded for ${currentLesson.subject.name} lesson`
  };
};

// Helper function to mark student present for all lessons today
const markPresentForAllLessonsToday = async (student, today, deviceId, scanTime, status) => {
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Find all lessons for student's class and grade today
  const todayLessons = await Schedule.find({
    class: student.class,
    grade: student.grade,
    dayOfWeek: dayOfWeek,
    isActive: true
  }).populate('subject');

  // Create lesson attendance records for all lessons (only if not already present)
  const lessonAttendancePromises = todayLessons.map(async (lesson) => {
    // Check if attendance already exists
    const existing = await LessonAttendance.findOne({
      student: student._id,
      schedule: lesson._id,
      date: today
    });

    // Only create if not already exists - this prevents duplicate entries
    if (!existing) {
      return LessonAttendance.create({
        student: student._id,
        schedule: lesson._id,
        subject: lesson.subject,
        room: lesson.room,
        date: today,
        scanTime: scanTime,
        device: deviceId,
        securityStatus: status || 'SECURE',
        notes: 'Auto-marked from entrance gate'
      });
    }
    return null; // Return null for existing attendance to avoid undefined promises
  });

  // Filter out null values and wait for all valid promises
  const validPromises = lessonAttendancePromises.filter(promise => promise !== null);
  await Promise.all(validPromises);
};

// Helper function to get current lesson
const getCurrentLesson = async (roomId, scanTime, studentClass, studentGrade, studentId = null) => {
  const dayOfWeek = scanTime.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = scanTime.toTimeString().slice(0, 5); // HH:MM format

  // First, find lessons in this room at this time
  const currentLessons = await Schedule.find({
    room: roomId,
    dayOfWeek: dayOfWeek,
    startTime: { $lte: currentTime },
    endTime: { $gte: currentTime },
    isActive: true
  }).populate('subject');

  if (currentLessons.length === 0) {
    return null;
  }

  // If studentId is provided, check if student is assigned to any of these subjects
  if (studentId) {
    const StudentSubject = require('../models/StudentSubject');
    
    for (const lesson of currentLessons) {
      // Check if student is assigned to this subject
      const studentSubjectAssignment = await StudentSubject.findOne({
        student: studentId,
        subject: lesson.subject._id,
        active: true
      });
      
      if (studentSubjectAssignment) {
        return lesson;
      }
    }
    
    // If no subject assignment found, check for class/grade match as fallback
    const classGradeMatch = currentLessons.find(lesson => 
      lesson.class === studentClass && lesson.grade === studentGrade
    );
    
    if (classGradeMatch) {
      return classGradeMatch;
    }
    
    return null;
  }

  // If no studentId provided, use original logic (for backward compatibility)
  const currentLesson = currentLessons.find(lesson => 
    lesson.class === studentClass && lesson.grade === studentGrade
  );

  return currentLesson || null;
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAttendanceRecords = async (req, res) => {
  try {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Filter options
  let query = {};
  
  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    const startDate = getStartOfDay(req.query.startDate);
  const endDate = getEndOfDay(req.query.endDate);
    
    query.date = {
      $gte: startDate,
      $lte: endDate
    };
  } else if (req.query.date) {
    // Filter by specific date
    const specificDate = getStartOfDay(req.query.date);
  const nextDay = getNextDay(specificDate);
    
    query.date = {
      $gte: specificDate,
      $lt: nextDay
    };
  }
  
  // Filter by student
  if (req.query.student) {
    query.student = req.query.student;
  }
  
  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Fetch attendance records with student details
  const records = await Attendance.find(query)
    .populate('student', 'name studentId class grade')
    .sort({ date: -1, entryTime: -1 })
    .skip(startIndex)
    .limit(limit);

  // Get total count
  const total = await Attendance.countDocuments(query);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: records
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance records'
    });
  }
};

// @desc    Get attendance report
// @route   GET /api/attendance/report
// @access  Private
exports.getAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, class: className, grade } = req.query;
  
  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('Please provide start and end dates');
  }
  
  // Parse dates
  const start = getStartOfDay(startDate);
  const end = getEndOfDay(endDate);
  
  // Build student filter
  let studentFilter = {};
  if (className) studentFilter.class = className;
  if (grade) studentFilter.grade = grade;
  
  // Get all relevant students
  const students = await Student.find(studentFilter).select('_id name studentId class grade');
  
  // Get attendance records for the date range
  const attendanceRecords = await Attendance.find({
    date: { $gte: start, $lte: end },
    student: { $in: students.map(s => s._id) }
  }).populate('student', 'name studentId class grade');
  
  // Group attendance by student
  const studentAttendance = {};
  
  // Initialize student attendance records
  students.forEach(student => {
    studentAttendance[student._id] = {
      student: {
        _id: student._id,
        name: student.name,
        studentId: student.studentId,
        class: student.class,
        grade: student.grade
      },
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      attendancePercentage: 0,
      records: []
    };
  });
  
  // Count days between start and end dates (inclusive)
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Process attendance records
  attendanceRecords.forEach(record => {
    const studentId = record.student._id.toString();
    
    if (studentAttendance[studentId]) {
      // Add record
      studentAttendance[studentId].records.push(record);
      
      // Update counts
      if (record.status === 'present') {
        studentAttendance[studentId].present += 1;
      } else if (record.status === 'absent') {
        studentAttendance[studentId].absent += 1;
      } else if (record.status === 'late') {
        studentAttendance[studentId].late += 1;
      } else if (record.status === 'half-day') {
        studentAttendance[studentId].halfDay += 1;
      }
    }
  });
  
  // Calculate attendance percentage for each student
  Object.keys(studentAttendance).forEach(studentId => {
    const student = studentAttendance[studentId];
    const presentDays = student.present + (student.late * 0.75) + (student.halfDay * 0.5);
    student.attendancePercentage = ((presentDays / totalDays) * 100).toFixed(2);
  });
  
  // Convert to array for response
  const reportData = Object.values(studentAttendance);
  
  res.status(200).json({
    success: true,
    totalDays,
    data: reportData
  });
});

// @desc    Manually add attendance record
// @route   POST /api/attendance
// @access  Private/Admin or Teacher
exports.addAttendanceRecord = asyncHandler(async (req, res) => {
  const { studentId, date, status, notes } = req.body;
  
  // Validate required fields
  if (!studentId || !date || !status) {
    res.status(400);
    throw new Error('Please provide student ID, date, and status');
  }
  
  // Find student
  const student = await Student.findById(studentId);
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  
  // Check if record already exists for this date
  const recordDate = getStartOfDay(date);
  const nextDay = getNextDay(recordDate);
  
  const existingRecord = await Attendance.findOne({
    student: studentId,
    date: { $gte: recordDate, $lt: nextDay }
  });
  
  if (existingRecord) {
    res.status(400);
    throw new Error('Attendance record already exists for this student on this date');
  }
  
  // Create attendance record
  const attendance = await Attendance.create({
    student: studentId,
    date: recordDate,
    status,
    notes,
    createdBy: req.user ? req.user._id : undefined,
    device: 'manual-entry'
  });
  
  // If status is present, set entry time
  if (status === 'present') {
    attendance.entryTime = toJakartaTime(date);
    await attendance.save();
  }
  
  res.status(201).json({
    success: true,
    data: attendance
  });
});

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin or Teacher
exports.updateAttendanceRecord = asyncHandler(async (req, res) => {
  const { status, notes, entryTime, exitTime } = req.body;
  
  let attendance = await Attendance.findById(req.params.id);
  
  if (!attendance) {
    res.status(404);
    throw new Error('Attendance record not found');
  }
  
  // Update fields
  if (status) attendance.status = status;
  if (notes) attendance.notes = notes;
  if (entryTime) attendance.entryTime = toJakartaTime(entryTime);
  if (exitTime) attendance.exitTime = toJakartaTime(exitTime);
  
  // Save updates
  attendance = await attendance.save();
  
  res.status(200).json({
    success: true,
    data: attendance
  });
});

// @desc    Get lesson attendance records
// @route   GET /api/attendance/lessons
// @access  Private
exports.getLessonAttendanceRecords = async (req, res) => {
  try {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Filter options
  let query = {};
  
  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    const startDate = getStartOfDay(req.query.startDate);
    const endDate = getEndOfDay(req.query.endDate);
    
    query.date = {
      $gte: startDate,
      $lte: endDate
    };
  } else if (req.query.date) {
    // Filter by specific date
    const specificDate = getStartOfDay(req.query.date);
    const nextDay = getNextDay(specificDate);
    
    query.date = {
      $gte: specificDate,
      $lt: nextDay
    };
  }
  
  // Filter by student
  if (req.query.student) {
    query.student = req.query.student;
  }
  
  // Filter by subject
  if (req.query.subject) {
    query.subject = req.query.subject;
  }
  
  // Filter by room
  if (req.query.room) {
    query.room = req.query.room;
  }

  // Fetch lesson attendance records with populated fields
  const records = await LessonAttendance.find(query)
    .populate('student', 'name studentId class grade')
    .populate('subject', 'name code')
    .populate('room', 'name building floor')
    .populate('schedule', 'startTime endTime dayOfWeek')
    .sort({ date: -1, scanTime: -1 })
    .skip(startIndex)
    .limit(limit);

  // Get total count
  const total = await LessonAttendance.countDocuments(query);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: records
    });
  } catch (error) {
    console.error('Error fetching lesson attendance records:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson attendance records'
    });
  }
};

// @desc    Get lesson attendance report
// @route   GET /api/attendance/lessons/report
// @access  Private
exports.getLessonAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, class: className, grade, subject, room } = req.query;
  
  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('Please provide start and end dates');
  }
  
  // Parse dates
  const start = getStartOfDay(startDate);
  const end = getEndOfDay(endDate);
  
  // Build student filter
  let studentFilter = {};
  if (className) studentFilter.class = className;
  if (grade) studentFilter.grade = grade;
  
  // Build lesson attendance filter
  let attendanceFilter = {
    date: { $gte: start, $lte: end }
  };
  if (subject) attendanceFilter.subject = subject;
  if (room) attendanceFilter.room = room;
  
  // Get all relevant students
  const students = await Student.find(studentFilter).select('_id name studentId class grade');
  
  if (students.length > 0) {
    attendanceFilter.student = { $in: students.map(s => s._id) };
  }
  
  // Get lesson attendance records for the date range
  const lessonAttendanceRecords = await LessonAttendance.find(attendanceFilter)
    .populate('student', 'name studentId class grade')
    .populate('subject', 'name code')
    .populate('room', 'name building floor')
    .populate('schedule', 'startTime endTime dayOfWeek');
  
  // Group attendance by student and subject
  const studentSubjectAttendance = {};
  
  // Process lesson attendance records
  lessonAttendanceRecords.forEach(record => {
    const studentId = record.student._id.toString();
    const subjectId = record.subject._id.toString();
    const key = `${studentId}-${subjectId}`;
    
    if (!studentSubjectAttendance[key]) {
      studentSubjectAttendance[key] = {
        student: record.student,
        subject: record.subject,
        present: 0,
        late: 0,
        absent: 0,
        total: 0,
        attendancePercentage: 0,
        records: []
      };
    }
    
    studentSubjectAttendance[key].records.push(record);
    studentSubjectAttendance[key].total += 1;
    
    if (record.status === 'present') {
      studentSubjectAttendance[key].present += 1;
    } else if (record.status === 'late') {
      studentSubjectAttendance[key].late += 1;
    } else if (record.status === 'absent') {
      studentSubjectAttendance[key].absent += 1;
    }
  });
  
  // Calculate attendance percentage for each student-subject combination
  Object.keys(studentSubjectAttendance).forEach(key => {
    const record = studentSubjectAttendance[key];
    const presentCount = record.present + (record.late * 0.75);
    record.attendancePercentage = record.total > 0 ? ((presentCount / record.total) * 100).toFixed(2) : 0;
  });
  
  // Convert to array for response
  const reportData = Object.values(studentSubjectAttendance);
  
  res.status(200).json({
    success: true,
    dateRange: { startDate, endDate },
    data: reportData
  });
});
