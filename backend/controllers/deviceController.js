const Device = require('../models/deviceModel');
const asyncHandler = require('express-async-handler');
const { getCurrentTime, toISOString } = require('../utils/timezone');

// @desc    Register a new device by admin
// @route   POST /api/devices/register
// @access  Private/Admin
exports.registerDevice = asyncHandler(async (req, res) => {
  const { deviceId, location, room } = req.body;

  // Validate required fields
  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: 'Device ID is required'
    });
  }

  // Validate Device ID format
  const deviceIdRegex = /^RFID-[0-9A-F]{1,8}$/;
  if (!deviceIdRegex.test(deviceId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Device ID format. Expected format: RFID-XXXXXXXX'
    });
  }

  if (!location) {
    return res.status(400).json({
      success: false,
      message: 'Location is required'
    });
  }

  // If location is CLASSROOM, room is required
  if (location === 'CLASSROOM' && !room) {
    return res.status(400).json({
      success: false,
      message: 'Room is required for classroom devices'
    });
  }

  try {
    // Extract hashed MAC ID from device ID
    const hashedMacId = deviceId.replace('RFID-', '');

    // Check if device with this Device ID already exists
    const existingDevice = await Device.findOne({ deviceId });
    
    if (existingDevice) {
      // Update existing device registration
      existingDevice.hashedMacId = hashedMacId;
      existingDevice.location = location;
      existingDevice.room = location === 'CLASSROOM' ? room : null;
      // Device is automatically active when registered
      
      await existingDevice.save();
      await existingDevice.populate('room', 'name building floor');
      
      return res.status(200).json({
        success: true,
        data: existingDevice,
        message: 'Device registration updated successfully'
      });
    }

    // Create new device entry
    const deviceData = {
      deviceId,
      hashedMacId,
      location,
      room: location === 'CLASSROOM' ? room : null,
      // Device is automatically active when registered
      status: 'OFFLINE' // Will be updated when device connects
    };

    const device = new Device(deviceData);
    await device.save();
    await device.populate('room', 'name building floor');

    res.status(201).json({
      success: true,
      data: device,
      message: 'Device registered successfully'
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device'
    });
  }
});

// @desc    Device initial connection (from ESP32)
// @route   POST /api/devices/connect
// @access  Public
exports.deviceConnect = asyncHandler(async (req, res) => {
  const { deviceId, macAddress, ipAddress, wifiSignal, firmware } = req.body;

  // Either deviceId or macAddress must be provided
  if (!deviceId && !macAddress) {
    return res.status(400).json({
      success: false,
      message: 'Either Device ID or MAC Address is required'
    });
  }

  try {
    let finalDeviceId, hashedMacId;
    
    if (deviceId) {
      // Use provided deviceId and extract hashedMacId
      finalDeviceId = deviceId;
      if (deviceId.startsWith('RFID-')) {
        hashedMacId = deviceId.replace('RFID-', '');
      } else {
        hashedMacId = deviceId;
      }
    } else {
      // Generate device ID from MAC address (legacy support)
      const cleanMac = macAddress.replace(/:/g, '').toUpperCase();
      let hash = 0;
      for (let i = 0; i < cleanMac.length; i++) {
        hash = (hash * 31 + cleanMac.charCodeAt(i)) >>> 0; // Use unsigned 32-bit
      }
      hashedMacId = hash.toString(16).toUpperCase();
      // Ensure max 8 characters
      if (hashedMacId.length > 8) {
        hashedMacId = hashedMacId.substring(hashedMacId.length - 8);
      }
      finalDeviceId = `RFID-${hashedMacId}`;
    }

    // Find or create device
    const searchCriteria = [{ deviceId: finalDeviceId }];
    if (macAddress) {
      searchCriteria.push({ macAddress: macAddress.toUpperCase() });
    }
    
    let device = await Device.findOne({ 
      $or: searchCriteria
    });

    if (!device) {
      // Create new unregistered device
      const deviceData = {
        deviceId: finalDeviceId,
        hashedMacId,
        ipAddress,
        wifiSignal,
        firmware,
        status: 'NORMAL',
        lastHeartbeat: getCurrentTime(),
        // Device starts as unregistered
        location: 'ENTRANCE_GATE', // Default location
        description: 'Unregistered device'
      };
      
      // Only add macAddress if provided
      if (macAddress) {
        deviceData.macAddress = macAddress.toUpperCase();
      }
      
      device = new Device(deviceData);
    } else {
      // Update existing device
      if (macAddress) {
        device.macAddress = macAddress.toUpperCase();
      }
      device.hashedMacId = hashedMacId;
      device.deviceId = finalDeviceId;
      device.ipAddress = ipAddress;
      device.wifiSignal = wifiSignal;
      device.firmware = firmware;
      device.status = 'NORMAL';
      device.lastHeartbeat = getCurrentTime();
    }

    await device.save();
    await device.populate('room', 'name building floor');

    res.status(200).json({
      success: true,
      data: {
        deviceId: device.deviceId,
        hashedMacId: device.hashedMacId,
        // Device registration status managed by admin
        location: device.location,
        room: device.room
      },
      message: 'Device connected successfully'
    });
  } catch (error) {
    console.error('Device connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect device'
    });
  }
});

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
exports.getDevices = asyncHandler(async (req, res) => {
  // Update status for devices that haven't sent heartbeats recently
  await Device.checkOfflineDevices();
  
  const { deviceType, room, status } = req.query;
  
  // Build filter object
  const filter = {};
  if (deviceType) filter.deviceType = deviceType;
  if (room) filter.room = room;
  if (status) filter.status = status;
  
  const devices = await Device.find(filter)
    .populate('room', 'name building floor')
    .sort({ lastHeartbeat: -1 });

  res.status(200).json({
    success: true,
    count: devices.length,
    data: devices
  });
});

// @desc    Get a single device
// @route   GET /api/devices/:deviceId
// @access  Private
exports.getDevice = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId })
    .populate('room', 'name building floor');

  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found'
    });
  }

  res.status(200).json({
    success: true,
    data: device
  });
});

// @desc    Get device by device ID (for ESP32)
// @route   GET /api/devices/device/:deviceId
// @access  Public
exports.getDeviceByDeviceId = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId }).populate('room', 'name building floor');

  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found'
    });
  }

  res.json({
    success: true,
    data: {
      deviceId: device.deviceId,
      hashedMacId: device.hashedMacId,
      location: device.location,
      room: device.room,
      status: device.status
    }
  });
});

// @desc    Update device
// @route   PUT /api/devices/:deviceId
// @access  Private/Admin
exports.updateDevice = asyncHandler(async (req, res) => {
  const { location, description, room } = req.body;

  // If changing to CLASSROOM location, room is required
  if (location === 'CLASSROOM' && !room) {
    return res.status(400).json({
      success: false,
      message: 'Room is required for classroom devices'
    });
  }

  const updateData = {
    location,
    description,
    room: location === 'CLASSROOM' ? room : null
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const device = await Device.findOneAndUpdate(
    { deviceId: req.params.deviceId },
    updateData,
    { new: true, runValidators: true }
  ).populate('room', 'name building floor');

  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found'
    });
  }

  res.status(200).json({
    success: true,
    data: device
  });
});

// @desc    Delete device
// @route   DELETE /api/devices/:deviceId
// @access  Private/Admin
exports.deleteDevice = asyncHandler(async (req, res) => {
  const device = await Device.findOneAndDelete({ deviceId: req.params.deviceId });

  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Device deleted successfully'
  });
});
     
// @desc    Device heartbeat to update status and network info
// @route   POST /api/devices/heartbeat
// @access  Public
exports.deviceHeartbeat = asyncHandler(async (req, res) => {
  const { deviceId, ipAddress, wifiSignal, uptime, cacheSize, firmware, status } = req.body;

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: 'Device ID is required'
    });
  }

  const device = await Device.findOne({ deviceId });

  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found. Please ensure device is connected and registered.'
    });
  }

  // Update device status and network information
  device.status = status || 'NORMAL';
  device.lastHeartbeat = getCurrentTime();
  
  if (ipAddress) device.ipAddress = ipAddress;
  if (wifiSignal !== undefined) device.wifiSignal = wifiSignal;
  if (uptime !== undefined) device.uptime = uptime;
  if (cacheSize !== undefined) device.cacheSize = cacheSize;
  if (firmware) device.firmware = firmware;

  await device.save();
  await device.populate('room', 'name building floor');

  res.json({
    success: true,
    data: {
      deviceId: device.deviceId,
      hashedMacId: device.hashedMacId,
      status: device.status,
      lastHeartbeat: device.lastHeartbeat,
      location: device.location,
      room: device.room
    },
    serverTime: toISOString(getCurrentTime())
  });
});
    
    // Remove duplicate processHeartbeat function since deviceHeartbeat handles this now
