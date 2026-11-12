/**
 * @file paymentController.js
 * @description Handles Razorpay order creation, payment verification, and webhook processing
 * for automatic GST invoice creation in the Billing Module.
 */

const {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
  getRazorpayInstance
} = require('../services/razorpayService');
const InvoiceModel = require('../models/Invoice');
const CompanyModel = require('../models/Company');
const logger = require('../utils/logger');

class PaymentController {
  /**
   * GET /api/payments/config
   * Returns whether Razorpay is configured and public key_id for frontend Checkout
   */
  static async getConfig(req, res) {
    try {
      const key_id = process.env.RAZORPAY_KEY_ID || '';
      const isConfigured = Boolean(key_id && process.env.RAZORPAY_KEY_SECRET);

      return res.json({
        success: true,
        data: {
          isConfigured,
          keyId: key_id
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/payments/create-order
   * Creates a new Razorpay order for customer checkout
   */
  static async createOrder(req, res) {
    try {
      const {
        amount,
        clientName,
        clientCompany,
        clientEmail,
        clientPhone,
        clientAddress,
        clientCity,
        clientPincode,
        clientGstin,
        serviceTitle,
        serviceDescription,
        sacCode,
        isGst = true
      } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount in INR is required'
        });
      }

      if (!clientName || !clientPhone) {
        return res.status(400).json({
          success: false,
          message: 'Customer name and phone number are required'
        });
      }

      // Notes are stored in Razorpay order metadata
      const notes = {
        clientName: String(clientName || '').substring(0, 40),
        clientCompany: String(clientCompany || '').substring(0, 40),
        clientEmail: String(clientEmail || '').substring(0, 40),
        clientPhone: String(clientPhone || '').substring(0, 20),
        clientAddress: String(clientAddress || '').substring(0, 100),
        clientCity: String(clientCity || '').substring(0, 30),
        clientPincode: String(clientPincode || '').substring(0, 10),
        clientGstin: String(clientGstin || '').substring(0, 20),
        serviceTitle: String(serviceTitle || 'IT Professional Services').substring(0, 50),
        serviceDescription: String(serviceDescription || '').substring(0, 100),
        sacCode: String(sacCode || '998314').substring(0, 10),
        billType: isGst ? 'gst' : 'non_gst'
      };

      const order = await createRazorpayOrder({
        amountInRupees: amount,
        receipt: `ord_${Date.now()}`,
        notes
      });

      return res.json({
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount, // in paise
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (err) {
      logger.error(`[PaymentController] createOrder error: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to initiate Razorpay order'
      });
    }
  }

  /**
   * Helper function: Generates and saves a full GST / Non-GST invoice from Razorpay payment details
   */
  static async createInvoiceFromPayment({
    orderId,
    paymentId,
    paymentMethod = 'Online / Razorpay',
    amountPaid, // In INR
    customerData = {},
    serviceData = {},
    billType = 'gst'
  }) {
    // Check if an invoice for this payment ID or order ID already exists
    if (paymentId) {
      const existing = await InvoiceModel.findByPaymentId(paymentId);
      if (existing) {
        logger.info(`[PaymentController] Invoice already exists for payment ${paymentId} (#${existing.doc_number})`);
        return existing;
      }
    }

    // 1. Fetch company profile snapshot
    const company = await CompanyModel.get();

    // 2. Prepare line items and calculate tax
    // For a GST bill where the customer paid a total amount (e.g., ₹11,800),
    // Grand Total = ₹11,800.
    // If GST rate is 18%, Subtotal = 11,800 / 1.18 = ₹10,000, Total GST = ₹1,800.
    const isGst = billType === 'gst';
    const gstRate = isGst ? 18.00 : 0.00;
    const totalAmount = Number(amountPaid) || 0;

    let subtotal = totalAmount;
    if (isGst && gstRate > 0) {
      subtotal = Math.round((totalAmount / (1 + (gstRate / 100))) * 100) / 100;
    }

    const serviceTitle = serviceData.serviceTitle || 'IT Services & Software Solutions';
    const serviceDescription = serviceData.serviceDescription || `Payment received via Razorpay (Payment ID: ${paymentId || 'N/A'})`;
    const sacCode = serviceData.sacCode || '998314';

    const items = [
      {
        id: 'item_1',
        service_title: serviceTitle,
        description: serviceDescription,
        sac_code: sacCode,
        qty: 1,
        rate: subtotal,
        amount: subtotal
      }
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    // Build complete invoice payload
    const invoicePayload = {
      doc_type: 'invoice',
      bill_type: isGst ? 'gst' : 'non_gst',
      issue_date: todayStr,
      due_date: todayStr,
      status: 'paid', // Marked as paid because customer completed payment

      // Customer details
      client_name: customerData.clientName || customerData.name || 'Valued Customer',
      client_company: customerData.clientCompany || customerData.company || '',
      client_email: customerData.clientEmail || customerData.email || '',
      client_phone: customerData.clientPhone || customerData.phone || '',
      client_address: customerData.clientAddress || customerData.address || '',
      client_city: customerData.clientCity || customerData.city || '',
      client_state: customerData.clientState || customerData.state || '',
      client_pincode: customerData.clientPincode || customerData.pincode || '',
      client_gstin: customerData.clientGstin || customerData.gstin || '',

      // Service items
      items,
      discount_rate: 0,
      discount_amount: 0,
      tax_type: isGst ? 'cgst_sgst' : 'none',
      gst_rate: gstRate,

      // Payment details
      payment_id: paymentId || '',
      order_id: orderId || '',
      payment_method: paymentMethod || 'Razorpay Online',

      notes: `Payment confirmed via Razorpay. Transaction ID: ${paymentId || 'N/A'}`
    };

    const newInvoice = await InvoiceModel.create(invoicePayload);
    logger.info(`[PaymentController] Successfully created auto-invoice #${newInvoice.doc_number} for payment ${paymentId}`);
    return newInvoice;
  }

  /**
   * POST /api/payments/verify
   * Called by frontend immediately upon Razorpay checkout completion
   */
  static async verifyAndCreateInvoice(req, res) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        customerData = {},
        serviceData = {},
        amount, // in INR
        billType = 'gst'
      } = req.body;

      if (!razorpay_payment_id) {
        return res.status(400).json({ success: false, message: 'Payment ID is missing' });
      }

      // Verify signature if order_id is present
      if (razorpay_order_id && razorpay_signature) {
        const isValid = verifyPaymentSignature({
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          signature: razorpay_signature
        });

        if (!isValid) {
          logger.warn(`[PaymentController] Invalid payment signature for order ${razorpay_order_id}`);
          return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
      }

      // Fetch verified payment from Razorpay API
      let paymentMethod = 'Razorpay';
      let verifiedAmount = amount;
      const paymentInfo = await fetchPaymentDetails(razorpay_payment_id);
      if (paymentInfo) {
        paymentMethod = paymentInfo.method ? `Razorpay (${paymentInfo.method.toUpperCase()})` : 'Razorpay';
        if (paymentInfo.amount) {
          verifiedAmount = paymentInfo.amount / 100;
        }
      }

      // Generate GST Invoice in the Billing Module
      const invoice = await PaymentController.createInvoiceFromPayment({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        paymentMethod,
        amountPaid: verifiedAmount,
        customerData,
        serviceData,
        billType
      });

      return res.json({
        success: true,
        message: 'Payment verified and GST invoice generated successfully!',
        data: {
          invoiceId: invoice.id,
          docNumber: invoice.doc_number,
          invoice
        }
      });
    } catch (err) {
      logger.error(`[PaymentController] verifyAndCreateInvoice error: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: err.message || 'Payment verification failed'
      });
    }
  }

  /**
   * POST /api/payments/webhook
   * Razorpay Webhook endpoint for 100% automated background capture
   */
  static async handleWebhook(req, res) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = req.rawBody || JSON.stringify(req.body);

      // Verify webhook signature if secret configured
      if (process.env.RAZORPAY_WEBHOOK_SECRET) {
        const isValid = verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          logger.warn('[PaymentController] Webhook signature verification failed');
          return res.status(400).json({ status: 'invalid_signature' });
        }
      }

      const event = req.body.event;
      logger.info(`[PaymentController] Received Razorpay Webhook: ${event}`);

      // Handle payment capture, order paid, or payment link paid events
      if (
        event === 'payment.captured' ||
        event === 'order.paid' ||
        event === 'payment_link.paid'
      ) {
        // Razorpay sends payment entity either in payload.payment.entity or payload.payment_link.entity
        const payment = req.body.payload?.payment?.entity;
        const paymentLink = req.body.payload?.payment_link?.entity;

        if (payment && payment.id) {
          const notes = payment.notes || (paymentLink && paymentLink.notes) || {};
          const amountPaid = (payment.amount || 0) / 100;

          // Extract customer details from payment or payment link
          const customerName =
            notes.clientName ||
            notes.customer_name ||
            paymentLink?.customer?.name ||
            payment.email?.split('@')[0] ||
            'Valued Customer';

          const customerEmail =
            payment.email ||
            paymentLink?.customer?.email ||
            notes.clientEmail ||
            '';

          const customerPhone =
            payment.contact ||
            paymentLink?.customer?.contact ||
            notes.clientPhone ||
            '';

          const serviceDescription =
            paymentLink?.description ||
            notes.serviceDescription ||
            `Payment received via Razorpay Payment Link (${payment.id})`;

          const serviceTitle =
            notes.serviceTitle ||
            paymentLink?.description ||
            'IT Professional Services';

          await PaymentController.createInvoiceFromPayment({
            orderId: payment.order_id || paymentLink?.id || '',
            paymentId: payment.id,
            paymentMethod: payment.method ? `Razorpay (${payment.method.toUpperCase()})` : 'Razorpay Payment Link',
            amountPaid,
            customerData: {
              clientName: customerName,
              clientCompany: notes.clientCompany || notes.company || '',
              clientEmail: customerEmail,
              clientPhone: customerPhone,
              clientAddress: notes.clientAddress || notes.address || '',
              clientCity: notes.clientCity || notes.city || '',
              clientPincode: notes.clientPincode || notes.pincode || '',
              clientGstin: notes.clientGstin || notes.gstin || ''
            },
            serviceData: {
              serviceTitle: serviceTitle,
              serviceDescription: serviceDescription,
              sacCode: notes.sacCode || '998314'
            },
            billType: notes.billType || 'gst'
          });
        }
      }

      return res.json({ status: 'ok' });
    } catch (err) {
      logger.error(`[PaymentController] Webhook processing error: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = PaymentController;

