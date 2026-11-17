/**
 * @file authRoutes.js
 * @description Authentication, Session, and Password Management endpoints.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/authMiddleware');

// POST /api/auth/login (with brute-force rate limiting and single-device enforcement)
router.post('/login', loginRateLimiter, authController.login);

// POST /api/auth/logout (immediate session invalidation)
router.post('/logout', authController.logout);

// GET /api/auth/verify (token and device session validity check)
router.get('/verify', authController.verifyToken);

// POST /api/auth/change-password (protected by JWT authentication)
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
