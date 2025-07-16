const mongoose = require('mongoose');

const StudentSubjectSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  }
});

// Compound index to prevent duplicate assignments
StudentSubjectSchema.index({ student: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('StudentSubject', StudentSubjectSchema);