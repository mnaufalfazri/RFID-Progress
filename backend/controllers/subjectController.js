const Subject = require('../models/Subject');
const StudentSubject = require('../models/StudentSubject');
const Student = require('../models/Student');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private (Admin, Teacher)
exports.getSubjects = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = { active: true };

  // Filter by grade if provided
  if (req.query.grade) {
    query.grade = req.query.grade;
  }

  // Search by name or code
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { code: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const subjects = await Subject.find(query)
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);

  const total = await Subject.countDocuments(query);

  res.status(200).json({
    success: true,
    count: subjects.length,
    total,
    data: subjects
  });
});

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private (Admin, Teacher)
exports.getSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('createdBy', 'name');

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  res.status(200).json({
    success: true,
    data: subject
  });
});

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private (Admin only)
exports.createSubject = asyncHandler(async (req, res) => {
  // Add createdBy field
  req.body.createdBy = req.user.id;
  


  const subject = await Subject.create(req.body);

  res.status(201).json({
    success: true,
    data: subject
  });
});

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (Admin only)
exports.updateSubject = asyncHandler(async (req, res) => {
  let subject = await Subject.findById(req.params.id);

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }
  


  subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: subject
  });
});

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (Admin only)
exports.deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  // Soft delete - set active to false
  await Subject.findByIdAndUpdate(req.params.id, { active: false });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Assign subject to student
// @route   POST /api/subjects/:id/assign
// @access  Private (Admin, Teacher)
exports.assignSubjectToStudent = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  const subjectId = req.params.id;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide student IDs as an array'
    });
  }

  // Check if subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });
  }

  // Check if students exist
  const students = await Student.find({ _id: { $in: studentIds }, active: true });
  if (students.length !== studentIds.length) {
    return res.status(400).json({
      success: false,
      error: 'One or more students not found or inactive'
    });
  }

  const assignments = [];
  const errors = [];

  for (const studentId of studentIds) {
    try {
      // Check if assignment already exists
      const existingAssignment = await StudentSubject.findOne({
        student: studentId,
        subject: subjectId,
        active: true
      });

      if (!existingAssignment) {
        const assignment = await StudentSubject.create({
          student: studentId,
          subject: subjectId,
          assignedBy: req.user.id
        });
        assignments.push(assignment);
      } else {
        const student = students.find(s => s._id.toString() === studentId);
        errors.push(`${student.name} is already assigned to this subject`);
      }
    } catch (error) {
      const student = students.find(s => s._id.toString() === studentId);
      errors.push(`Failed to assign ${student.name}: ${error.message}`);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      assigned: assignments.length,
      errors: errors
    }
  });
});

// @desc    Remove subject assignment from student
// @route   DELETE /api/subjects/:id/assign/:studentId
// @access  Private (Admin, Teacher)
exports.removeSubjectAssignment = asyncHandler(async (req, res) => {
  const { id: subjectId, studentId } = req.params;

  const assignment = await StudentSubject.findOne({
    student: studentId,
    subject: subjectId,
    active: true
  });

  if (!assignment) {
    return res.status(404).json({
      success: false,
      error: 'Assignment not found'
    });
  }

  // Soft delete - set active to false
  await StudentSubject.findByIdAndUpdate(assignment._id, { active: false });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get students assigned to a subject
// @route   GET /api/subjects/:id/students
// @access  Private (Admin, Teacher)
exports.getSubjectStudents = asyncHandler(async (req, res) => {
  const subjectId = req.params.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const assignments = await StudentSubject.find({
    subject: subjectId,
    active: true
  })
    .populate({
      path: 'student',
      select: 'name studentId class grade rfidTag active'
    })
    .populate('assignedBy', 'name')
    .sort({ assignedAt: -1 })
    .limit(limit)
    .skip(startIndex);

  const total = await StudentSubject.countDocuments({
    subject: subjectId,
    active: true
  });

  const students = assignments.map(assignment => ({
    ...assignment.student.toObject(),
    assignedAt: assignment.assignedAt,
    assignedBy: assignment.assignedBy
  }));

  res.status(200).json({
    success: true,
    count: students.length,
    total,
    data: students
  });
});

// @desc    Get subjects assigned to a student
// @route   GET /api/students/:id/subjects
// @access  Private (Admin, Teacher)
exports.getStudentSubjects = asyncHandler(async (req, res) => {
  const studentId = req.params.id;

  const assignments = await StudentSubject.find({
    student: studentId,
    active: true
  })
    .populate({
      path: 'subject',
      select: 'name code description grade teacher active',
      populate: {
        path: 'teacher',
        select: 'name email'
      }
    })
    .populate('assignedBy', 'name')
    .sort({ assignedAt: -1 });

  const subjects = assignments.map(assignment => ({
    ...assignment.subject.toObject(),
    assignedAt: assignment.assignedAt,
    assignedBy: assignment.assignedBy
  }));

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: subjects
  });
});