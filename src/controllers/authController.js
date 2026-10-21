/**
 * @file authController.js
 * @description Authentication controller managing Administrator login, session verification,
 * and secure password updates with bcrypt hashing and JWT tokens.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'workpulse_enterprise_secret_key_2026';

/**
 * Admin Login
 * POST /api/auth/login
 * Body: { username, password }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const trimmedUsername = username.trim();
    const rows = await query('SELECT * FROM `admin_auth` WHERE username = ? LIMIT 1', [trimmedUsername]);
    const admin = rows && rows[0];

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        name: admin.name || 'Administrator'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`[Auth] Admin user '${admin.username}' logged in successfully.`);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name || 'Administrator'
      }
    });
  } catch (err) {
    logger.error(`[Auth] Login error: ${err.message}`, { stack: err.stack });
    next(err);
  }
}

/**
 * Verify JWT Token
 * GET /api/auth/verify
 */
async function verifyToken(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'No authorization token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user exists in database/store
    const rows = await query('SELECT id, username, name FROM `admin_auth` WHERE id = ? LIMIT 1', [decoded.id]);
    const admin = rows && rows[0];

    if (!admin) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'User no longer exists.'
      });
    }

    return res.json({
      success: true,
      valid: true,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name
      }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      valid: false,
      message: 'Token has expired or is invalid.'
    });
  }
}

/**
 * Change Administrator Password
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword, confirmPassword, username }
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    let targetUsername = req.body.username;

    // Check token if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded?.username) {
          targetUsername = decoded.username;
        }
      } catch (e) {
        // Continue with targetUsername if passed
      }
    }

    if (!targetUsername) {
      targetUsername = 'admin';
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are all required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation password do not match.'
      });
    }

    // Lookup user
    const rows = await query('SELECT * FROM `admin_auth` WHERE username = ? LIMIT 1', [targetUsername.trim()]);
    const admin = rows && rows[0];

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: `Admin user '${targetUsername}' not found.`
      });
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: 'The current password you entered is incorrect.'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Save updated password
    await query('UPDATE `admin_auth` SET password_hash = ? WHERE username = ?', [
      newPasswordHash,
      admin.username
    ]);

    logger.info(`[Auth] Password changed successfully for admin user '${admin.username}'.`);

    return res.json({
      success: true,
      message: 'Password updated successfully. Please use your new password next time you log in.'
    });
  } catch (err) {
    logger.error(`[Auth] Change password error: ${err.message}`, { stack: err.stack });
    next(err);
  }
}

module.exports = {
  login,
  verifyToken,
  changePassword
};
