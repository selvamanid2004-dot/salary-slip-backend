/**
 * @file authRoutes.js
 * @description Authentication and Password Management endpoints.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/authMiddleware');

// POST /api/auth/login (with brute-force rate limiting)
router.post('/login', loginRateLimiter, authController.login);

// GET /api/auth/verify
router.get('/verify', authController.verifyToken);

// POST /api/auth/change-password (protected by JWT authentication)
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
