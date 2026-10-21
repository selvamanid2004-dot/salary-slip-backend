/**
 * @file requestLogger.js
 * @description HTTP Request logging middleware using Morgan integrated with Winston.
 * Captures all incoming HTTP requests, response status codes, and latency.
 */

const morgan = require('morgan');
const logger = require('../utils/logger');

// Define custom stream for Morgan to redirect output to Winston logger
const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Morgan middleware format
const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream }
);

module.exports = requestLogger;
