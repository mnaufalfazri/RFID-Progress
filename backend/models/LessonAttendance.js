const mongoose = require('mongoose');

const LessonAttendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  schedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  scanTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent'],
    default: 'present'
  },
  device: {
    type: String,
    required: true
  },
  securityStatus: {
    type: String,
    enum: ['SECURE', 'TAMPERED'],
    default: 'SECURE'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for student, schedule, and date to ensure unique attendance per lesson
LessonAttendanceSchema.index({ student: 1, schedule: 1, date: 1 }, { unique: true });

// Index for efficient queries
LessonAttendanceSchema.index({ date: 1, room: 1 });
LessonAttendanceSchema.index({ student: 1, date: 1 });

module.exports = mongoose.model('LessonAttendance', LessonAttendanceSchema);