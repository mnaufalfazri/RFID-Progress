const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a room name'],
    trim: true,
    maxlength: [100, 'Room name can not be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Please add a room code'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Room code can not be more than 10 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Please add room capacity'],
    min: [1, 'Capacity must be at least 1']
  },
  floor: {
    type: String,
    trim: true
  },
  building: {
    type: String,
    trim: true
  },
  facilities: [{
    type: String,
    trim: true
  }],
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
RoomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Room', RoomSchema);