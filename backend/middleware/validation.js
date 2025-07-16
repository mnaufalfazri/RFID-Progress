const validator = require('validator');

// Sanitize and validate input data
exports.sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  for (let key in req.body) {
    if (typeof req.body[key] === 'string') {
      // Trim whitespace and normalize
      req.body[key] = req.body[key].trim();
      
      // Only escape HTML for fields that might contain user content
      // Skip technical fields like deviceId, rfidTag, etc.
      const technicalFields = ['deviceId', 'rfidTag', 'password', 'token'];
      if (!technicalFields.includes(key)) {
        req.body[key] = validator.escape(req.body[key]);
      }
    }
  }
  next();
};

// Validate email format
exports.validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (email && !validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }
  next();
};

// Validate password strength
exports.validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (password) {
    if (!validator.isLength(password, { min: 6 })) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }
    
    // Check for at least one number and one letter
    if (!validator.matches(password, /^(?=.*[A-Za-z])(?=.*\d)/)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one letter and one number'
      });
    }
  }
  next();
};

// Validate RFID tag format
exports.validateRFID = (req, res, next) => {
  const { rfidTag } = req.body;
  
  if (rfidTag) {
    // RFID should be alphanumeric and 8-16 characters
    if (!validator.isAlphanumeric(rfidTag) || !validator.isLength(rfidTag, { min: 8, max: 16 })) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RFID tag format'
      });
    }
  }
  next();
};

// Validate device ID format
exports.validateDeviceId = (req, res, next) => {
  const { deviceId } = req.body || req.params;
  
  if (deviceId) {
    // Device ID should be alphanumeric with underscores/hyphens and reasonable length
    // Allow letters, numbers, underscores, and hyphens
    if (!validator.matches(deviceId, /^[A-Za-z0-9_-]+$/) || !validator.isLength(deviceId, { min: 3, max: 32 })) {
      return res.status(400).json({
        success: false,
        error: 'Invalid device ID format. Use only letters, numbers, underscores, and hyphens (3-32 characters)'
      });
    }
  }
  next();
};

// Validate required fields
exports.validateRequired = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    fields.forEach(field => {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
};

// Validate MongoDB ObjectId
exports.validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    
    if (id && !validator.isMongoId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};