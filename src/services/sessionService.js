/**
 * @file sessionService.js
 * @description Single-device session manager and device restriction enforcement.
 * Ensures each user account can only be logged in on one device at a time.
 * Provides instant in-memory session validation with MySQL persistence.
 */

const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// In-memory cache for ultra-fast (0ms) session validation on every request
// Map<username, SessionObject>
const activeSessions = new Map();

// Session inactivity threshold (12 hours)
const INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000;

/**
 * Initializes the active_sessions table in MySQL if needed
 */
async function ensureSessionTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS \`active_sessions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT DEFAULT 1,
        \`username\` VARCHAR(100) NOT NULL,
        \`device_id\` VARCHAR(120) NOT NULL,
        \`device_name\` VARCHAR(255) DEFAULT '',
        \`ip_address\` VARCHAR(64) DEFAULT '',
        \`token_id\` VARCHAR(120) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`last_active\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_active\` TINYINT(1) DEFAULT 1,
        INDEX \`idx_username_active\` (\`username\`, \`is_active\`),
        INDEX \`idx_token\` (\`token_id\`),
        INDEX \`idx_device\` (\`device_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Load any currently active sessions into memory
    const rows = await query(
      'SELECT * FROM `active_sessions` WHERE is_active = 1 ORDER BY last_active DESC'
    );
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (!activeSessions.has(row.username)) {
          activeSessions.set(row.username, {
            id: row.id,
            username: row.username,
            deviceId: row.device_id,
            deviceName: row.device_name,
            ipAddress: row.ip_address,
            tokenId: row.token_id,
            createdAt: new Date(row.created_at).getTime(),
            lastActive: new Date(row.last_active).getTime(),
            isActive: Boolean(row.is_active)
          });
        }
      }
      logger.info(`[SessionService] Loaded ${activeSessions.size} active session(s) into memory cache.`);
    }
  } catch (err) {
    logger.warn(`[SessionService] Error initializing active_sessions table: ${err.message}`);
  }
}

/**
 * Retrieves the currently active session for a given username
 * @param {string} username 
 * @returns {Promise<Object|null>}
 */
async function getActiveSession(username) {
  if (!username) return null;

  // 1. Check in-memory cache first
  const cached = activeSessions.get(username);
  if (cached && cached.isActive) {
    // Check inactivity timeout
    if (Date.now() - cached.lastActive > INACTIVITY_TIMEOUT_MS) {
      await invalidateSession(username, cached.tokenId, 'Session expired due to inactivity');
      return null;
    }
    return cached;
  }

  // 2. Check database
  try {
    const rows = await query(
      'SELECT * FROM `active_sessions` WHERE username = ? AND is_active = 1 ORDER BY last_active DESC LIMIT 1',
      [username]
    );
    if (rows && rows.length > 0) {
      const row = rows[0];
      const session = {
        id: row.id,
        username: row.username,
        deviceId: row.device_id,
        deviceName: row.device_name,
        ipAddress: row.ip_address,
        tokenId: row.token_id,
        createdAt: new Date(row.created_at).getTime(),
        lastActive: new Date(row.last_active).getTime(),
        isActive: Boolean(row.is_active)
      };

      if (Date.now() - session.lastActive > INACTIVITY_TIMEOUT_MS) {
        await invalidateSession(username, session.tokenId, 'Session expired due to inactivity');
        return null;
      }

      activeSessions.set(username, session);
      return session;
    }
  } catch (err) {
    logger.debug(`[SessionService] DB getActiveSession check: ${err.message}`);
  }

  return null;
}

/**
 * Creates or updates an active session enforcing single-device restriction
 * @param {Object} params
 * @param {string} params.username
 * @param {string} params.deviceId
 * @param {string} params.deviceName
 * @param {string} params.ipAddress
 * @param {boolean} [params.forceLogout=false]
 * @returns {Promise<{ success: boolean, session?: Object, conflict?: Object }>}
 */
async function createSession({ username, deviceId, deviceName = '', ipAddress = '', forceLogout = false }) {
  if (!username || !deviceId) {
    throw new Error('Username and deviceId are required for session registration.');
  }

  const existingSession = await getActiveSession(username);

  // If there is an active session on a DIFFERENT device
  if (existingSession && existingSession.isActive && existingSession.deviceId !== deviceId) {
    if (!forceLogout) {
      logger.warn(
        `[SessionService] Single-device conflict: User '${username}' attempted login from device '${deviceName || deviceId}' while active on '${existingSession.deviceName || existingSession.deviceId}'.`
      );
      return {
        success: false,
        conflict: {
          code: 'DEVICE_CONFLICT',
          message: `This account is currently logged in on another device (${existingSession.deviceName || 'Active Device'}). Simultaneous device sessions are not allowed. Please log out from that device first.`,
          activeDevice: existingSession.deviceName || 'Another Device',
          lastActive: existingSession.lastActive
        }
      };
    }

    // Force logout: Invalidate existing session on the other device
    logger.info(
      `[SessionService] Force logout requested by user '${username}' on new device '${deviceName}'. Terminating session on '${existingSession.deviceName}'.`
    );
    await invalidateSession(username, existingSession.tokenId, 'Session terminated by login from new device');
  }

  // If there was an old session on the SAME device, invalidate previous token
  if (existingSession && existingSession.deviceId === deviceId) {
    await invalidateSession(username, existingSession.tokenId, 'New login on same device');
  }

  // Create new unique token ID
  const tokenId = 'sess_' + crypto.randomBytes(24).toString('hex');
  const now = Date.now();

  const newSession = {
    username,
    deviceId,
    deviceName: deviceName || 'Web Browser',
    ipAddress: ipAddress || '',
    tokenId,
    createdAt: now,
    lastActive: now,
    isActive: true
  };

  // Cache in memory immediately
  activeSessions.set(username, newSession);

  // Persist to database asynchronously
  try {
    const res = await query(
      `INSERT INTO \`active_sessions\` (
        username, device_id, device_name, ip_address, token_id, is_active
      ) VALUES (?, ?, ?, ?, ?, 1)`,
      [username, deviceId, newSession.deviceName, newSession.ipAddress, tokenId]
    );
    if (res?.insertId) {
      newSession.id = res.insertId;
    }
  } catch (err) {
    logger.warn(`[SessionService] Failed to persist session to DB: ${err.message}`);
  }

  logger.info(`[SessionService] Session registered for '${username}' on device '${newSession.deviceName}' (Token: ${tokenId.substring(0, 10)}...).`);

  return {
    success: true,
    session: newSession
  };
}

/**
 * Validates whether a token and deviceId are currently active
 * Called on every protected API endpoint
 * @param {string} username 
 * @param {string} tokenId 
 * @param {string} deviceId 
 * @returns {boolean}
 */
function validateSessionSync(username, tokenId, deviceId) {
  if (!username || !tokenId) return false;

  const session = activeSessions.get(username);
  if (!session || !session.isActive) return false;

  // Validate token match
  if (session.tokenId !== tokenId) return false;

  // Validate device match if deviceId is provided
  if (deviceId && session.deviceId !== deviceId) return false;

  // Update last active in memory
  session.lastActive = Date.now();
  return true;
}

/**
 * Asynchronously validates session, falling back to database if not in memory
 * @param {string} username 
 * @param {string} tokenId 
 * @param {string} deviceId 
 * @returns {Promise<boolean>}
 */
async function validateSession(username, tokenId, deviceId) {
  if (validateSessionSync(username, tokenId, deviceId)) {
    return true;
  }

  // Check DB if not found in memory (e.g. after a process restart)
  try {
    const rows = await query(
      'SELECT * FROM `active_sessions` WHERE username = ? AND token_id = ? AND is_active = 1 LIMIT 1',
      [username, tokenId]
    );
    if (rows && rows.length > 0) {
      const row = rows[0];
      if (deviceId && row.device_id !== deviceId) {
        return false;
      }

      // Restore to cache
      const session = {
        id: row.id,
        username: row.username,
        deviceId: row.device_id,
        deviceName: row.device_name,
        ipAddress: row.ip_address,
        tokenId: row.token_id,
        createdAt: new Date(row.created_at).getTime(),
        lastActive: Date.now(),
        isActive: true
      };
      activeSessions.set(username, session);
      return true;
    }
  } catch (err) {
    logger.debug(`[SessionService] validateSession DB fallback error: ${err.message}`);
  }

  return false;
}

/**
 * Invalidates an active session
 * @param {string} username 
 * @param {string} [tokenId] 
 * @param {string} [reason='User logged out']
 */
async function invalidateSession(username, tokenId, reason = 'User logged out') {
  if (!username) return;

  const current = activeSessions.get(username);
  if (current) {
    if (!tokenId || current.tokenId === tokenId) {
      current.isActive = false;
      activeSessions.delete(username);
      logger.info(`[SessionService] Invalidated in-memory session for '${username}' (${reason}).`);
    }
  }

  // Invalidate in database
  try {
    if (tokenId) {
      await query(
        'UPDATE `active_sessions` SET is_active = 0 WHERE username = ? AND token_id = ?',
        [username, tokenId]
      );
    } else {
      await query(
        'UPDATE `active_sessions` SET is_active = 0 WHERE username = ? AND is_active = 1',
        [username]
      );
    }
  } catch (err) {
    logger.debug(`[SessionService] invalidateSession DB error: ${err.message}`);
  }
}

/**
 * Invalidates all sessions for a device
 * @param {string} deviceId 
 */
async function invalidateByDeviceId(deviceId) {
  if (!deviceId) return;

  for (const [username, session] of activeSessions.entries()) {
    if (session.deviceId === deviceId) {
      session.isActive = false;
      activeSessions.delete(username);
    }
  }

  try {
    await query(
      'UPDATE `active_sessions` SET is_active = 0 WHERE device_id = ?',
      [deviceId]
    );
  } catch (err) {
    logger.debug(`[SessionService] invalidateByDeviceId DB error: ${err.message}`);
  }
}

module.exports = {
  ensureSessionTable,
  getActiveSession,
  createSession,
  validateSession,
  validateSessionSync,
  invalidateSession,
  invalidateByDeviceId
};
