const winston = require('winston');
const path = require('path');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gauge-tracking-api' },
  transports: [
    // Write all logs to audit.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '..', '..', '..', 'logs', 'audit.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Write error logs to error.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '..', '..', '..', 'logs', 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// If not production, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `[${timestamp}] ${level}: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    )
  }));
}

module.exports = logger;