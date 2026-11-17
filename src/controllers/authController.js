/**
 * @file authController.js
 * @description Authentication controller managing Administrator login, session verification,
 * single-device restriction, logout session invalidation, and password updates.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'workpulse_enterprise_secret_key_2026';

/**
 * Admin Login with Single-Device Restriction
 * POST /api/auth/login
 * Body: { username, password, deviceId, deviceName, forceLogout }
 */
async function login(req, res, next) {
  try {
    const { username, password, deviceId, deviceName, forceLogout } = req.body;

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

    // Determine client IP and Device ID
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const resolvedDeviceId = deviceId || ('dev_fallback_' + req.headers['user-agent']?.replace(/\W/g, '').substring(0, 32));
    const resolvedDeviceName = deviceName || (req.headers['user-agent']?.includes('Windows') ? 'Windows PC' : 'Web Device');

    // Attempt to create session enforcing single-device policy
    const sessionResult = await sessionService.createSession({
      username: admin.username,
      deviceId: resolvedDeviceId,
      deviceName: resolvedDeviceName,
      ipAddress,
      forceLogout: Boolean(forceLogout)
    });

    if (!sessionResult.success) {
      // Device Conflict: Already logged in on another device
      return res.status(409).json({
        success: false,
        code: sessionResult.conflict.code,
        message: sessionResult.conflict.message,
        activeDevice: sessionResult.conflict.activeDevice,
        lastActive: sessionResult.conflict.lastActive,
        canForceLogout: true
      });
    }

    // Generate JWT token embedded with device and session IDs
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        name: admin.name || 'Administrator',
        deviceId: sessionResult.session.deviceId,
        sessionId: sessionResult.session.tokenId
      },
      JWT_SECRET,
      { expiresIn: '1d' } // Session-based daily token
    );

    logger.info(`[Auth] Admin user '${admin.username}' logged in successfully on device '${resolvedDeviceName}'.`);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name || 'Administrator'
      },
      session: {
        deviceId: sessionResult.session.deviceId,
        deviceName: sessionResult.session.deviceName
      }
    });
  } catch (err) {
    logger.error(`[Auth] Login error: ${err.message}`, { stack: err.stack });
    next(err);
  }
}

/**
 * Admin Logout with Immediate Session Invalidation
 * POST /api/auth/logout
 * Body: { deviceId }
 */
async function logout(req, res, next) {
  try {
    let username = null;
    let sessionId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        username = decoded?.username;
        sessionId = decoded?.sessionId;
      } catch (e) {
        // Token might already be expired, proceed with deviceId
      }
    }

    const { deviceId } = req.body;

    if (username) {
      await sessionService.invalidateSession(username, sessionId, 'User explicitly logged out');
    } else if (deviceId) {
      await sessionService.invalidateByDeviceId(deviceId);
    }

    logger.info(`[Auth] User '${username || 'Unknown'}' logged out and session was invalidated immediately.`);

    return res.json({
      success: true,
      message: 'Signed out successfully. Device session has been invalidated.'
    });
  } catch (err) {
    logger.error(`[Auth] Logout error: ${err.message}`, { stack: err.stack });
    next(err);
  }
}

/**
 * Verify JWT Token and Active Device Session
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

    // Validate active session
    if (decoded.sessionId) {
      const clientDeviceId = req.headers['x-device-id'] || decoded.deviceId;
      const isSessionValid = await sessionService.validateSession(decoded.username, decoded.sessionId, clientDeviceId);

      if (!isSessionValid) {
        return res.status(401).json({
          success: false,
          valid: false,
          code: 'SESSION_TERMINATED',
          message: 'Session has ended or account was logged in from another device.'
        });
      }
    }

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
  logout,
  verifyToken,
  changePassword
};
