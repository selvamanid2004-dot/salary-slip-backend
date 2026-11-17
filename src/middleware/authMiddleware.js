/**
 * @file authMiddleware.js
 * @description JWT Authentication Guard & Active Session Validator.
 * Protects sensitive API endpoints and enforces single-device session integrity.
 */

const jwt = require('jsonwebtoken');
const { validateSession } = require('../services/sessionService');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'workpulse_enterprise_secret_key_2026';

/**
 * Middleware to require valid JWT Bearer token and an active device session
 */
async function requireAuth(req, res, next) {
  // Allow OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'NO_TOKEN',
      message: 'Access denied. You must be logged in as an administrator to access this resource.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Device & Session Validation
    if (decoded.sessionId) {
      const clientDeviceId = req.headers['x-device-id'] || decoded.deviceId;
      const isSessionValid = await validateSession(decoded.username, decoded.sessionId, clientDeviceId);

      if (!isSessionValid) {
        logger.warn(`[AuthMiddleware] Terminated session rejected for user '${decoded.username}'.`);
        return res.status(401).json({
          success: false,
          code: 'SESSION_TERMINATED',
          message: 'Your session has ended because this account was logged into from another device or logged out. Please sign in again.'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      message: 'Your session has expired or the token is invalid. Please sign in again.'
    });
  }
}

module.exports = {
  requireAuth
};
