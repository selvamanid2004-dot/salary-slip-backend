/**
 * @file companyRoutes.js
 * @description API Routes for Company Profile & Letterhead settings.
 */

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// GET /api/company - Retrieve current company profile
router.get('/', companyController.getCompany);

// PUT /api/company - Update company profile
router.put('/', companyController.updateCompany);

module.exports = router;
