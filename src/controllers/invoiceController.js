/**
 * @file invoiceController.js
 * @description Controller for Quotation and Billing Module endpoints.
 */

const InvoiceModel = require('../models/Invoice');
const CompanyModel = require('../models/Company');
const { IT_SERVICES_CATALOG } = require('../services/billingCalculator');
const { generateInvoiceHtml } = require('../services/invoiceHtmlGenerator');
const logger = require('../utils/logger');

class InvoiceController {
  /**
   * GET /api/billing
   * List invoices / quotations with filtering
   */
  static async list(req, res, next) {
    try {
      const { doc_type, bill_type, status, search } = req.query;
      const documents = await InvoiceModel.getAll({ doc_type, bill_type, status, search });
      res.json({ success: true, count: documents.length, data: documents });
    } catch (err) {
      logger.error(`[InvoiceController] List error: ${err.message}`);
      next(err);
    }
  }

  /**
   * GET /api/billing/catalog
   * Returns standard IT services list
   */
  static async getCatalog(req, res) {
    res.json({ success: true, data: IT_SERVICES_CATALOG });
  }

  /**
   * GET /api/billing/next-number?type=invoice|quotation
   */
  static async getNextNumber(req, res, next) {
    try {
      const docType = req.query.type === 'quotation' ? 'quotation' : 'invoice';
      const nextNumber = await InvoiceModel.getNextNumber(docType);
      res.json({ success: true, data: { next_number: nextNumber, doc_type: docType } });
    } catch (err) {
      logger.error(`[InvoiceController] Next number error: ${err.message}`);
      next(err);
    }
  }

  /**
   * GET /api/billing/:id
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const document = await InvoiceModel.getById(id);
      if (!document) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      res.json({ success: true, data: document });
    } catch (err) {
      logger.error(`[InvoiceController] GetById error: ${err.message}`);
      next(err);
    }
  }

  /**
   * POST /api/billing
   */
  static async create(req, res, next) {
    try {
      const { client_name, client_phone, items } = req.body;
      if (!client_name || !client_phone) {
        return res.status(400).json({
          success: false,
          message: 'Client Name and Contact Number are required.'
        });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one IT service line item is required.'
        });
      }

      const created = await InvoiceModel.create(req.body);
      logger.info(`[InvoiceController] Created ${created.doc_type} ${created.doc_number} for ${created.client_name}`);
      res.status(201).json({ success: true, message: `${created.doc_type === 'quotation' ? 'Quotation' : 'Invoice'} created successfully.`, data: created });
    } catch (err) {
      logger.error(`[InvoiceController] Create error: ${err.message}`);
      next(err);
    }
  }

  /**
   * PUT /api/billing/:id
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await InvoiceModel.update(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      logger.info(`[InvoiceController] Updated ${updated.doc_type} ${updated.doc_number}`);
      res.json({ success: true, message: 'Updated successfully.', data: updated });
    } catch (err) {
      logger.error(`[InvoiceController] Update error: ${err.message}`);
      next(err);
    }
  }

  /**
   * PATCH /api/billing/:id/status
   */
  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
      }
      const updated = await InvoiceModel.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      res.json({ success: true, message: `Status updated to ${status}.`, data: updated });
    } catch (err) {
      logger.error(`[InvoiceController] UpdateStatus error: ${err.message}`);
      next(err);
    }
  }

  /**
   * DELETE /api/billing/:id
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await InvoiceModel.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      await InvoiceModel.delete(id);
      logger.info(`[InvoiceController] Deleted document ${existing.doc_number}`);
      res.json({ success: true, message: `${existing.doc_type === 'quotation' ? 'Quotation' : 'Invoice'} deleted successfully.` });
    } catch (err) {
      logger.error(`[InvoiceController] Delete error: ${err.message}`);
      next(err);
    }
  }

  /**
   * POST /api/billing/:id/convert
   * Converts a quotation to an invoice
   */
  static async convert(req, res, next) {
    try {
      const { id } = req.params;
      const invoice = await InvoiceModel.convertToInvoice(id);
      logger.info(`[InvoiceController] Converted quotation #${id} to invoice ${invoice.doc_number}`);
      res.json({
        success: true,
        message: `Quotation converted to official Invoice ${invoice.doc_number} successfully.`,
        data: invoice
      });
    } catch (err) {
      logger.error(`[InvoiceController] Convert error: ${err.message}`);
      next(err);
    }
  }

  /**
   * GET /api/billing/:id/print
   * Serves direct printable HTML
   */
  static async getPrintHtml(req, res, next) {
    try {
      const { id } = req.params;
      const invoice = await InvoiceModel.getById(id);
      if (!invoice) {
        return res.status(404).send('Document not found');
      }
      const company = await CompanyModel.get();
      const html = generateInvoiceHtml(invoice, company);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      logger.error(`[InvoiceController] PrintHtml error: ${err.message}`);
      next(err);
    }
  }
}

module.exports = InvoiceController;

