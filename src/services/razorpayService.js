/**
 * @file razorpayService.js
 * @description Razorpay client wrapper and order/webhook utility functions.
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

let razorpayInstance = null;

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret
    });
  }
  return razorpayInstance;
}

/**
 * Creates a Razorpay Order
 * @param {Object} params
 * @param {number} params.amountInRupees - Amount in INR (e.g. 5000 for ₹5000)
 * @param {string} params.receipt - Internal receipt or invoice reference ID
 * @param {Object} params.notes - Metadata containing customer & service details
 */
async function createRazorpayOrder({ amountInRupees, receipt, notes = {} }) {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new Error('Razorpay keys not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env');
  }

  // Razorpay amounts are in the smallest currency sub-unit (paise for INR)
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: String(receipt || `rcpt_${Date.now()}`).substring(0, 40),
    notes: {
      ...notes
    }
  };

  const order = await rzp.orders.create(options);
  return order;
}

/**
 * Verifies Razorpay Payment Signature
 */
function verifyPaymentSignature({ order_id, payment_id, signature }) {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) return false;

  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(`${order_id}|${payment_id}`);
  const generatedSignature = hmac.digest('hex');

  return generatedSignature === signature;
}

/**
 * Verifies Razorpay Webhook Signature
 */
function verifyWebhookSignature(rawBody, signature, secret) {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');

  return expectedSignature === signature;
}

/**
 * Fetches Payment Details from Razorpay API
 */
async function fetchPaymentDetails(paymentId) {
  const rzp = getRazorpayInstance();
  if (!rzp) return null;
  try {
    const payment = await rzp.payments.fetch(paymentId);
    return payment;
  } catch (err) {
    logger.error(`[Razorpay] Failed to fetch payment ${paymentId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  getRazorpayInstance,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails
};

