/**
 * @file paymentRoutes.js
 * @description Routes for Razorpay payment initialization, verification, and webhooks.
 */

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

// Public config: Check if Razorpay is configured and get keyId
router.get('/config', PaymentController.getConfig);

// Create order
router.post('/create-order', PaymentController.createOrder);

// Verify payment and auto-generate invoice
router.post('/verify', PaymentController.verifyAndCreateInvoice);

// Razorpay webhook endpoint
router.post('/webhook', PaymentController.handleWebhook);

module.exports = router;

