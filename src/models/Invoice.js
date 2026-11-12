/**
 * @file Invoice.js
 * @description Data access layer for IT Company Quotations & Invoices.
 * Seamlessly works with MySQL / TiDB and the resilient in-memory fallback store.
 */

const { query, inMemoryStore, getDbStatus } = require('../config/database');
const CompanyModel = require('./Company');
const { calculateInvoiceFinancials } = require('../services/billingCalculator');

class InvoiceModel {
  /**
   * Generates the next sequential document number
   * Format: INV-YYYY-XXXX or QT-YYYY-XXXX
   */
  static async getNextNumber(docType = 'invoice') {
    const prefix = docType === 'quotation' ? 'QT' : 'INV';
    const year = new Date().getFullYear();
    const isMock = !getDbStatus().isMySQL;

    let maxNum = 0;
    if (isMock) {
      const docs = inMemoryStore.invoices || [];
      const matchRegex = new RegExp(`^${prefix}-${year}-(\\d+)$`);
      for (const doc of docs) {
        if (doc.doc_type === docType && doc.doc_number) {
          const m = doc.doc_number.match(matchRegex);
          if (m) {
            const val = parseInt(m[1], 10);
            if (val > maxNum) maxNum = val;
          }
        }
      }
    } else {
      const rows = await query(
        `SELECT doc_number FROM \`invoices\` 
         WHERE doc_type = ? AND doc_number LIKE ? 
         ORDER BY id DESC LIMIT 50`,
        [docType, `${prefix}-${year}-%`]
      );
      const matchRegex = new RegExp(`^${prefix}-${year}-(\\d+)$`);
      for (const r of rows) {
        const m = r.doc_number.match(matchRegex);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val > maxNum) maxNum = val;
        }
      }
    }

    const nextSeq = String(maxNum + 1).padStart(4, '0');
    return `${prefix}-${year}-${nextSeq}`;
  }

  /**
   * Retrieves all invoices or quotations with filtering
   */
  static async getAll({ doc_type, bill_type, status, search } = {}) {
    const isMock = !getDbStatus().isMySQL;

    if (isMock) {
      let list = [...(inMemoryStore.invoices || [])];

      if (doc_type && doc_type !== 'all') {
        list = list.filter(i => i.doc_type === doc_type);
      }
      if (bill_type && bill_type !== 'all') {
        list = list.filter(i => i.bill_type === bill_type);
      }
      if (status && status !== 'all') {
        list = list.filter(i => i.status === status);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(i =>
          (i.doc_number && i.doc_number.toLowerCase().includes(q)) ||
          (i.client_name && i.client_name.toLowerCase().includes(q)) ||
          (i.client_company && i.client_company.toLowerCase().includes(q))
        );
      }

      // Sort newest first
      return list.sort((a, b) => new Date(b.created_at || b.issue_date) - new Date(a.created_at || a.issue_date));
    }

    let sql = 'SELECT * FROM `invoices` WHERE 1=1';
    const params = [];

    if (doc_type && doc_type !== 'all') {
      sql += ' AND doc_type = ?';
      params.push(doc_type);
    }
    if (bill_type && bill_type !== 'all') {
      sql += ' AND bill_type = ?';
      params.push(bill_type);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      sql += ' AND (doc_number LIKE ? OR client_name LIKE ? OR client_company LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY id DESC';
    const rows = await query(sql, params);

    return rows.map(r => {
      if (typeof r.items === 'string') {
        try {
          r.items = JSON.parse(r.items);
        } catch {
          r.items = [];
        }
      }
      return r;
    });
  }

  /**
   * Retrieves single invoice / quotation by ID
   */
  static async getById(id) {
    const isMock = !getDbStatus().isMySQL;

    let doc = null;
    if (isMock) {
      doc = (inMemoryStore.invoices || []).find(i => Number(i.id) === Number(id));
    } else {
      const rows = await query('SELECT * FROM `invoices` WHERE id = ? LIMIT 1', [Number(id)]);
      if (rows && rows.length > 0) {
        doc = rows[0];
      }
    }

    if (!doc) return null;

    if (typeof doc.items === 'string') {
      try {
        doc.items = JSON.parse(doc.items);
      } catch {
        doc.items = [];
      }
    }

    return doc;
  }

  /**
   * Creates a new invoice or quotation
   */
  static async create(data) {
    const company = await CompanyModel.get();

    // Financial calculations
    const financials = calculateInvoiceFinancials(data);

    // Document number
    const docType = data.doc_type === 'quotation' ? 'quotation' : 'invoice';
    const docNumber = data.doc_number?.trim() || await this.getNextNumber(docType);

    // Company Snapshot
    const compName = data.company_name || company?.company_name || '';
    const compAddress = data.company_address || company?.address || '';
    const compPhone = data.company_phone || company?.phone || company?.mobile_number || '';
    const compEmail = data.company_email || company?.email || '';
    const compGstin = data.company_gstin || company?.gst_number || '';
    const compPan = data.company_pan || company?.pan_number || '';
    const compLogo = data.company_logo || company?.logo_url || '';

    // Bank Details Snapshot
    const bankName = data.bank_name || company?.bank_name || '';
    const bankAccount = data.bank_account_no || company?.bank_account_no || '';
    const bankIfsc = data.bank_ifsc || company?.bank_ifsc_code || '';
    const bankBranch = data.bank_branch || company?.bank_branch || '';
    const bankHolder = data.bank_account_holder || company?.bank_account_holder || compName;
    const bankUpi = data.bank_upi_id || company?.bank_upi_id || '';

    const newRecord = {
      doc_type: docType,
      doc_number: docNumber,
      bill_type: financials.bill_type,
      issue_date: data.issue_date || new Date().toISOString().split('T')[0],
      due_date: data.due_date || null,
      status: data.status || (docType === 'quotation' ? 'draft' : 'unpaid'),
      client_name: (data.client_name || '').trim(),
      client_company: (data.client_company || '').trim(),
      client_email: (data.client_email || '').trim(),
      client_phone: (data.client_phone || '').trim(),
      client_address: (data.client_address || '').trim(),
      client_city: (data.client_city || '').trim(),
      client_state: (data.client_state || '').trim(),
      client_pincode: (data.client_pincode || '').trim(),
      client_gstin: (data.client_gstin || '').trim(),
      company_name: compName,
      company_address: compAddress,
      company_phone: compPhone,
      company_email: compEmail,
      company_gstin: compGstin,
      company_pan: compPan,
      company_logo: compLogo,
      bank_name: bankName,
      bank_account_no: bankAccount,
      bank_ifsc: bankIfsc,
      bank_branch: bankBranch,
      bank_account_holder: bankHolder,
      bank_upi_id: bankUpi,
      items: financials.items,
      subtotal: financials.subtotal,
      discount_rate: financials.discount_rate,
      discount_amount: financials.discount_amount,
      tax_type: financials.tax_type,
      gst_rate: financials.gst_rate,
      cgst_amount: financials.cgst_amount,
      sgst_amount: financials.sgst_amount,
      igst_amount: financials.igst_amount,
      total_tax: financials.total_tax,
      grand_total: financials.grand_total,
      grand_total_in_words: financials.grand_total_in_words,
      currency_symbol: data.currency_symbol || company?.currency_symbol || '₹',
      notes: data.notes || '',
      terms: data.terms || '',
      converted_from_id: data.converted_from_id || null,
      payment_id: data.payment_id || null,
      order_id: data.order_id || null,
      payment_method: data.payment_method || null,
      created_at: new Date().toISOString()
    };

    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      if (!inMemoryStore.invoices) inMemoryStore.invoices = [];
      const newId = inMemoryStore.invoices.length > 0
        ? Math.max(...inMemoryStore.invoices.map(i => i.id)) + 1
        : 1;
      newRecord.id = newId;
      inMemoryStore.invoices.push(newRecord);
      return newRecord;
    }

    const insertSql = `
      INSERT INTO \`invoices\` (
        doc_type, doc_number, bill_type, issue_date, due_date, status,
        client_name, client_company, client_email, client_phone, client_address, client_city, client_state, client_pincode, client_gstin,
        company_name, company_address, company_phone, company_email, company_gstin, company_pan, company_logo,
        bank_name, bank_account_no, bank_ifsc, bank_branch, bank_account_holder, bank_upi_id,
        items, subtotal, discount_rate, discount_amount, tax_type, gst_rate,
        cgst_amount, sgst_amount, igst_amount, total_tax, grand_total, grand_total_in_words,
        currency_symbol, notes, terms, converted_from_id,
        payment_id, order_id, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      newRecord.doc_type, newRecord.doc_number, newRecord.bill_type, newRecord.issue_date, newRecord.due_date, newRecord.status,
      newRecord.client_name, newRecord.client_company, newRecord.client_email, newRecord.client_phone, newRecord.client_address,
      newRecord.client_city, newRecord.client_state, newRecord.client_pincode, newRecord.client_gstin,
      newRecord.company_name, newRecord.company_address, newRecord.company_phone, newRecord.company_email, newRecord.company_gstin,
      newRecord.company_pan, newRecord.company_logo,
      newRecord.bank_name, newRecord.bank_account_no, newRecord.bank_ifsc, newRecord.bank_branch, newRecord.bank_account_holder, newRecord.bank_upi_id,
      JSON.stringify(newRecord.items), newRecord.subtotal, newRecord.discount_rate, newRecord.discount_amount, newRecord.tax_type, newRecord.gst_rate,
      newRecord.cgst_amount, newRecord.sgst_amount, newRecord.igst_amount, newRecord.total_tax, newRecord.grand_total, newRecord.grand_total_in_words,
      newRecord.currency_symbol, newRecord.notes, newRecord.terms, newRecord.converted_from_id,
      newRecord.payment_id, newRecord.order_id, newRecord.payment_method
    ];

    const result = await query(insertSql, params);
    return this.getById(result.insertId);
  }

  /**
   * Updates an existing invoice or quotation
   */
  static async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...data };
    const financials = calculateInvoiceFinancials(merged);

    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      const idx = inMemoryStore.invoices.findIndex(i => Number(i.id) === Number(id));
      if (idx !== -1) {
        inMemoryStore.invoices[idx] = {
          ...merged,
          items: financials.items,
          subtotal: financials.subtotal,
          discount_rate: financials.discount_rate,
          discount_amount: financials.discount_amount,
          tax_type: financials.tax_type,
          gst_rate: financials.gst_rate,
          cgst_amount: financials.cgst_amount,
          sgst_amount: financials.sgst_amount,
          igst_amount: financials.igst_amount,
          total_tax: financials.total_tax,
          grand_total: financials.grand_total,
          grand_total_in_words: financials.grand_total_in_words,
          updated_at: new Date().toISOString()
        };
        return inMemoryStore.invoices[idx];
      }
      return null;
    }

    const updateSql = `
      UPDATE \`invoices\` SET
        doc_type = ?, doc_number = ?, bill_type = ?, issue_date = ?, due_date = ?, status = ?,
        client_name = ?, client_company = ?, client_email = ?, client_phone = ?, client_address = ?, client_city = ?, client_state = ?, client_pincode = ?, client_gstin = ?,
        company_name = ?, company_address = ?, company_phone = ?, company_email = ?, company_gstin = ?, company_pan = ?, company_logo = ?,
        bank_name = ?, bank_account_no = ?, bank_ifsc = ?, bank_branch = ?, bank_account_holder = ?, bank_upi_id = ?,
        items = ?, subtotal = ?, discount_rate = ?, discount_amount = ?, tax_type = ?, gst_rate = ?,
        cgst_amount = ?, sgst_amount = ?, igst_amount = ?, total_tax = ?, grand_total = ?, grand_total_in_words = ?,
        currency_symbol = ?, notes = ?, terms = ?
      WHERE id = ?
    `;

    const params = [
      merged.doc_type, merged.doc_number, financials.bill_type, merged.issue_date, merged.due_date || null, merged.status,
      merged.client_name, merged.client_company, merged.client_email, merged.client_phone, merged.client_address,
      merged.client_city, merged.client_state, merged.client_pincode, merged.client_gstin,
      merged.company_name, merged.company_address, merged.company_phone, merged.company_email, merged.company_gstin,
      merged.company_pan, merged.company_logo,
      merged.bank_name, merged.bank_account_no, merged.bank_ifsc, merged.bank_branch, merged.bank_account_holder, merged.bank_upi_id,
      JSON.stringify(financials.items), financials.subtotal, financials.discount_rate, financials.discount_amount, financials.tax_type, financials.gst_rate,
      financials.cgst_amount, financials.sgst_amount, financials.igst_amount, financials.total_tax, financials.grand_total, financials.grand_total_in_words,
      merged.currency_symbol, merged.notes, merged.terms,
      id
    ];

    await query(updateSql, params);
    return this.getById(id);
  }

  /**
   * Updates only document status (e.g., mark as Paid, Sent, Accepted)
   */
  static async updateStatus(id, status) {
    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      const doc = (inMemoryStore.invoices || []).find(i => Number(i.id) === Number(id));
      if (doc) {
        doc.status = status;
        doc.updated_at = new Date().toISOString();
        return doc;
      }
      return null;
    }

    await query('UPDATE `invoices` SET status = ? WHERE id = ?', [status, id]);
    return this.getById(id);
  }

  /**
   * Finds an invoice by Razorpay payment_id
   */
  static async findByPaymentId(paymentId) {
    if (!paymentId) return null;
    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      return (inMemoryStore.invoices || []).find(i => i.payment_id === paymentId) || null;
    }
    const rows = await query('SELECT * FROM `invoices` WHERE `payment_id` = ? LIMIT 1', [paymentId]);
    if (rows && rows.length > 0) {
      const doc = rows[0];
      if (typeof doc.items === 'string') {
        try {
          doc.items = JSON.parse(doc.items);
        } catch {
          doc.items = [];
        }
      }
      return doc;
    }
    return null;
  }

  /**
   * Deletes an invoice or quotation
   */
  static async delete(id) {
    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      if (inMemoryStore.invoices) {
        inMemoryStore.invoices = inMemoryStore.invoices.filter(i => Number(i.id) !== Number(id));
      }
      return true;
    }

    await query('DELETE FROM `invoices` WHERE id = ?', [Number(id)]);
    return true;
  }

  /**
   * Converts an existing quotation into a new official invoice
   */
  static async convertToInvoice(quotationId) {
    const quote = await this.getById(quotationId);
    if (!quote) throw new Error('Quotation not found');

    const nextInvoiceNumber = await this.getNextNumber('invoice');

    // Create the invoice copying all services and client details
    const invoiceData = {
      ...quote,
      id: undefined,
      doc_type: 'invoice',
      doc_number: nextInvoiceNumber,
      issue_date: new Date().toISOString().split('T')[0],
      status: 'unpaid',
      converted_from_id: quote.id
    };

    const newInvoice = await this.create(invoiceData);

    // Update quote status to accepted / converted
    await this.updateStatus(quotationId, 'accepted');

    return newInvoice;
  }
}

module.exports = InvoiceModel;

