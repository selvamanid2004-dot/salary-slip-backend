/**
 * @file logger.js
 * @description Centralized logging service using Winston.
 * Provides console and file transports with log level filtering and daily rotation.
 * Logs are stored in the `/backend/logs` directory.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const logDirectory = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Custom log format for readable output
const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'salary-slip-api' },
  transports: [
    // Output all logs with level 'error' to error.log
    new winston.transports.File({
      filename: path.join(logDirectory, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Output all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logDirectory, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, also log to the console with colorized output
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        logFormat
      )
    })
  );
}

module.exports = logger;
