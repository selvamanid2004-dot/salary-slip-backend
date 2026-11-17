/**
 * @file logger.js
 * @description Centralized logging service using Winston.
 * Provides console and file transports with log level filtering and daily rotation.
 * Logs are stored in the `/backend/logs` directory.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

let logDirectory = null;
try {
  if (process.versions && process.versions.electron) {
    const electron = require('electron');
    const app = electron.app || (electron.remote && electron.remote.app);
    if (app && app.getPath) {
      logDirectory = path.join(app.getPath('userData'), 'logs');
    }
  }
  if (!logDirectory) {
    logDirectory = path.join(__dirname, '../../logs');
  }
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }
} catch (e) {
  logDirectory = null;
}

// Custom log format for readable output
const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] [${level.toUpperCase()}]: ${stack || message}`;
});

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      logFormat
    )
  })
];

if (logDirectory) {
  try {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDirectory, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join(logDirectory, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    );
  } catch (e) {
    // Console transport remains active
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'salary-slip-api' },
  transports
});

module.exports = logger;
