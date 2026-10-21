/**
 * @file errorHandler.js
 * @description Centralized error-handling middleware.
 * Catches all errors from asynchronous controllers, logs them to Winston (and error.log),
 * and returns consistent JSON error payloads to API clients.
 */

const logger = require('../utils/logger');

/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode;

  // Log error with Winston
  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred',
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
