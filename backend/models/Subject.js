const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a subject name'],
    trim: true,
    maxlength: [100, 'Subject name can not be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Please add a subject code'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Subject code can not be more than 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  grade: {
    type: String,
    required: [true, 'Please add a grade'],
    trim: true
  },

  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt before saving
SubjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Subject', SubjectSchema);