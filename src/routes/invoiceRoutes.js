/**
 * @file invoiceRoutes.js
 * @description API Routes for Quotation and Billing Module (GST and Non-GST IT Services).
 */

const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');

// Standard IT Services catalog
router.get('/catalog', InvoiceController.getCatalog);

// Next sequential document number
router.get('/next-number', InvoiceController.getNextNumber);

// Printable HTML view (can be opened in new tab for native printing)
router.get('/:id/print', InvoiceController.getPrintHtml);

// List invoices / quotations
router.get('/', InvoiceController.list);

// Single invoice / quotation
router.get('/:id', InvoiceController.getById);

// Create new invoice / quotation
router.post('/', InvoiceController.create);

// Update existing invoice / quotation
router.put('/:id', InvoiceController.update);

// Update document status
router.patch('/:id/status', InvoiceController.updateStatus);

// Convert quotation to invoice
router.post('/:id/convert', InvoiceController.convert);

// Delete document
router.delete('/:id', InvoiceController.delete);

module.exports = router;

