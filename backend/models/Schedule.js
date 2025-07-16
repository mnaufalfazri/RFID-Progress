const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  class: {
    type: String,
    required: [true, 'Please specify the class'],
    trim: true
  },
  grade: {
    type: String,
    required: [true, 'Please specify the grade'],
    trim: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: {
    type: String,
    required: [true, 'Please specify start time'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'Please specify end time'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for efficient queries
ScheduleSchema.index({ room: 1, dayOfWeek: 1, startTime: 1 });
ScheduleSchema.index({ class: 1, grade: 1, dayOfWeek: 1 });

module.exports = mongoose.model('Schedule', ScheduleSchema);