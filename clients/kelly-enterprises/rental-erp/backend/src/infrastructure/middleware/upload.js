const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_TEMP_DIR || './uploads/temp';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Created upload directory', { path: uploadDir });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedOriginalName);
  }
});

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx').split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    logger.warn('File upload rejected - invalid file type', {
      fileName: file.originalname,
      fileType: fileExtension,
      allowedTypes
    });
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 10485760), // 10MB default
    files: 1 // Only allow 1 file per request
  }
});

/**
 * Middleware for single certificate file upload
 */
const uploadCertificate = upload.single('certificate');

/**
 * Error handling wrapper for multer
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxSize = parseInt(process.env.MAX_FILE_SIZE || 10485760);
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${maxSizeMB}MB`
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use "certificate" as the field name'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    // Other errors (like file type validation)
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

/**
 * Clean up temporary file
 * @param {string} filePath - Path to the temporary file
 */
const cleanupTempFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.debug('Cleaned up temporary file', { filePath });
    }
  } catch (error) {
    logger.warn('Failed to cleanup temporary file', { filePath, error: error.message });
  }
};

module.exports = {
  uploadCertificate,
  handleUploadError,
  cleanupTempFile
};
