const mongoose = require('mongoose');
const crypto = require('crypto');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true
    },
    macAddress: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allow multiple null values
      trim: true,
      uppercase: true
    },
    hashedMacId: {
      type: String,
      unique: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['NORMAL', 'TAMPERED', 'OFFLINE'],
      default: 'OFFLINE'
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      enum: ['CLASSROOM', 'ENTRANCE_GATE']
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: function() {
        return this.location === 'CLASSROOM';
      }
    },
    description: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: null
    },
    wifiSignal: {
      type: Number,
      default: null
    },
    uptime: {
      type: Number,
      default: 0
    },
    cacheSize: {
      type: Number,
      default: 0
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now
    },
    firmware: {
      type: String,
      default: null
    },

  },
  {
    timestamps: true
  }
);

// Pre-save middleware to generate hashed MAC ID
deviceSchema.pre('save', function(next) {
  // Only generate hashedMacId if macAddress is provided
  if (this.macAddress && (this.isModified('macAddress') || this.isNew)) {
    // Generate hash from MAC address
    this.hashedMacId = crypto.createHash('sha256').update(this.macAddress).digest('hex').substring(0, 16);
    
    // If deviceId is not set, use the hashed MAC ID
    if (!this.deviceId) {
      this.deviceId = this.hashedMacId;
    }
  }
  
  // If hashedMacId is not set but deviceId is provided, extract it from deviceId
  if (!this.hashedMacId && this.deviceId && this.deviceId.startsWith('RFID-')) {
    this.hashedMacId = this.deviceId.replace('RFID-', '');
  }
  
  next();
});

// Set device as offline if no heartbeat for 2 minutes
deviceSchema.statics.checkOfflineDevices = async function() {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  
  await this.updateMany(
    { 
      lastHeartbeat: { $lt: twoMinutesAgo },
      status: { $ne: 'OFFLINE' }
    },
    { 
      status: 'OFFLINE'
    }
  );
};

// Check if model already exists to avoid OverwriteModelError
const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

module.exports = Device;
