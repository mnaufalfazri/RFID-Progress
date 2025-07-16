const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  studentId: {
    type: String,
    required: [true, 'Please add a student ID'],
    unique: true,
    trim: true
  },
  rfidTag: {
    type: String,
    required: [true, 'Please add RFID tag number'],
    unique: true,
    trim: true
  },
  class: {
    type: String,
    required: [true, 'Please add a class'],
    trim: true
  },
  grade: {
    type: String,
    required: [true, 'Please add a grade'],
    trim: true
  },
  gender: {
    type: String,
    required: [true, 'Please add gender'],
    enum: ['male', 'female', 'other']
  },
  dateOfBirth: {
    type: Date
  },
  email: {
    type: String,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  parentContact: {
    type: String,
    match: [
      /^(\+\d{1,3}[- ]?)?\d{10}$/,
      'Please add a valid phone number'
    ]
  },
  address: {
    type: String,
    trim: true
  },
  photo: {
    type: String,
    default: 'default-student.jpg'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', StudentSchema);
