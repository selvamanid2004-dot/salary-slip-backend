/**
 * @file authMiddleware.js
 * @description JWT Authentication Guard Middleware.
 * Protects sensitive API endpoints against unauthorized access.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'workpulse_enterprise_secret_key_2026';

/**
 * Middleware to require valid JWT Bearer token
 */
function requireAuth(req, res, next) {
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
      message: 'Access denied. You must be logged in as an administrator to access this resource.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired or the token is invalid. Please sign in again.'
    });
  }
}

module.exports = {
  requireAuth
};
