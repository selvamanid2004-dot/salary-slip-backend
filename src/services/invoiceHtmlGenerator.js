/**
 * @file invoiceHtmlGenerator.js
 * @description Generates clean, modern, print-ready HTML for IT Company Invoices and Quotations.
 * Optimized for A4 printing and PDF generation with Times New Roman typography,
 * properly scaled logo, single currency symbols, and without Terms and Conditions.
 */

const { formatCurrency } = require('../utils/currencyFormatter');

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function generateInvoiceHtml(invoice, company) {
  const isQuotation = invoice.doc_type === 'quotation';
  const isGst = invoice.bill_type === 'gst';

  const docTitle = isQuotation
    ? (isGst ? 'SERVICE QUOTATION' : 'QUOTATION (NON-GST)')
    : (isGst ? 'TAX INVOICE' : 'INVOICE / BILL (NON-GST)');

  const docNumberLabel = isQuotation ? 'Quotation No:' : 'Invoice No:';
  const dateLabel = isQuotation ? 'Quote Date:' : 'Invoice Date:';
  const dueDateLabel = isQuotation ? 'Valid Until:' : 'Due Date:';

  const currencySymbol = invoice.currency_symbol || company?.currency_symbol || '₹';

  // Parse items safely
  let items = [];
  if (Array.isArray(invoice.items)) {
    items = invoice.items;
  } else if (typeof invoice.items === 'string') {
    try {
      items = JSON.parse(invoice.items);
    } catch {
      items = [];
    }
  }

  // Fallbacks for Company info
  const compName = invoice.company_name || company?.company_name || 'Apex Global Technologies Ltd.';
  const compTagline = company?.tagline || '';
  const compAddress = invoice.company_address || company?.address || [
    company?.address_line1,
    company?.address_line2,
    company?.city,
    company?.state,
    company?.postal_code
  ].filter(Boolean).join(', ');
  const compPhone = invoice.company_phone || company?.phone || company?.mobile_number || '';
  const compEmail = invoice.company_email || company?.email || '';
  const compGstin = invoice.company_gstin || company?.gst_number || '';
  const compPan = invoice.company_pan || company?.pan_number || '';
  const compLogo = invoice.company_logo || company?.logo_url || '';

  // Bank Details
  const bankName = invoice.bank_name || company?.bank_name || '';
  const bankAccount = invoice.bank_account_no || company?.bank_account_no || '';
  const bankIfsc = invoice.bank_ifsc || company?.bank_ifsc_code || '';
  const bankBranch = invoice.bank_branch || company?.bank_branch || '';
  const bankHolder = invoice.bank_account_holder || company?.bank_account_holder || compName;
  const bankUpi = invoice.bank_upi_id || company?.bank_upi_id || '';

  const hasBankDetails = Boolean(bankName || bankAccount || bankIfsc || bankUpi);

  // Filter unwanted sentence from notes if present
  const cleanedNotes = (invoice.notes || '')
    .replace(/Thank you for your business\.\s*Net payable within 15 days\./gi, '')
    .trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(docTitle)} - ${escapeHtml(invoice.doc_number)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: "Times New Roman", Times, serif;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13px;
      line-height: 1.45;
      color: #111827;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-container {
      width: 800px;
      margin: 0 auto;
      padding: 30px 36px;
      background: #ffffff;
    }

    /* Top Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: top;
    }
    .company-logo {
      max-height: 120px;
      max-width: 280px;
      width: auto;
      height: auto;
      object-fit: contain;
      margin-bottom: 10px;
      display: block;
    }
    .company-name {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      letter-spacing: 0.01em;
      line-height: 1.2;
    }
    .company-tagline {
      font-size: 13px;
      color: #4b5563;
      font-style: italic;
      margin-top: 2px;
    }
    .company-info {
      font-size: 13px;
      color: #374151;
      margin-top: 6px;
      line-height: 1.45;
    }
    .doc-title-block {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: ${isGst ? '#1e3a8a' : '#065f46'};
      text-transform: uppercase;
    }
    .doc-type-sub {
      display: inline-block;
      background: ${isGst ? '#eff6ff' : '#ecfdf5'};
      color: ${isGst ? '#1e40af' : '#047857'};
      border: 1px solid ${isGst ? '#bfdbfe' : '#a7f3d0'};
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .doc-meta-table {
      margin-top: 12px;
      margin-left: auto;
      border-collapse: collapse;
      font-size: 13px;
    }
    .doc-meta-table td {
      padding: 2px 6px;
    }
    .doc-meta-label {
      color: #4b5563;
      font-weight: 600;
      text-align: right;
    }
    .doc-meta-val {
      color: #111827;
      font-weight: 700;
      text-align: right;
    }

    .divider {
      height: 2px;
      background: #e5e7eb;
      margin: 14px 0 18px 0;
    }

    /* Client and Billing Information */
    .bill-to-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 14px 0;
      margin-bottom: 20px;
      margin-left: -14px;
      margin-right: -14px;
    }
    .bill-to-box {
      width: 58%;
      vertical-align: top;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 14px 16px;
    }
    .bank-quick-box {
      width: 42%;
      vertical-align: top;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 14px 16px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4b5563;
      margin-bottom: 6px;
    }
    .client-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }
    .client-company {
      font-size: 13.5px;
      font-weight: 600;
      color: #374151;
      margin-top: 2px;
    }
    .client-detail-text {
      font-size: 13px;
      color: #4b5563;
      margin-top: 5px;
      line-height: 1.45;
    }

    /* IT Services Line Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #111827;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 9px 10px;
      text-align: left;
    }
    .items-table th.text-right,
    .items-table td.text-right {
      text-align: right;
    }
    .items-table th.text-center,
    .items-table td.text-center {
      text-align: center;
    }
    .items-table td {
      padding: 10px 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      font-size: 13px;
    }
    .items-table tr:nth-child(even) td {
      background-color: #f9fafb;
    }
    .service-name {
      font-weight: 700;
      color: #111827;
      font-size: 13.5px;
    }
    .service-desc {
      font-size: 12px;
      color: #4b5563;
      margin-top: 3px;
      white-space: pre-line;
    }
    .sac-badge {
      display: inline-block;
      font-size: 11px;
      fontWeight: 600;
      background: #f3f4f6;
      color: #374151;
      padding: 1px 6px;
      border-radius: 3px;
    }

    /* Financials & Calculation section */
    .bottom-section {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }
    .bottom-section td {
      vertical-align: top;
    }
    .bank-and-words {
      width: 56%;
      padding-right: 16px;
    }
    .totals-box {
      width: 44%;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }
    .totals-table td {
      padding: 7px 14px;
      font-size: 13px;
    }
    .totals-label {
      color: #4b5563;
      font-weight: 600;
    }
    .totals-val {
      text-align: right;
      font-weight: 700;
      color: #111827;
    }
    .grand-total-row td {
      background: #111827;
      color: #ffffff;
      padding: 11px 14px;
      font-size: 15px;
      font-weight: 800;
    }
    .grand-total-row .totals-val {
      color: #ffffff;
      font-size: 17px;
    }

    /* Words Box */
    .words-box {
      background: #f3f4f6;
      border-left: 4px solid #1e3a8a;
      padding: 10px 14px;
      border-radius: 0 4px 4px 0;
      margin-bottom: 14px;
    }
    .words-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4b5563;
    }
    .words-text {
      font-size: 13.5px;
      font-weight: 700;
      color: #111827;
      margin-top: 3px;
    }

    /* Bank Account Block */
    .bank-card {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px 14px;
      background: #f9fafb;
      margin-bottom: 14px;
    }
    .bank-title {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1e3a8a;
      margin-bottom: 8px;
    }
    .bank-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .bank-table td {
      padding: 2px 0;
    }
    .bank-lbl {
      width: 110px;
      color: #4b5563;
      font-weight: 600;
    }
    .bank-v {
      color: #111827;
      font-weight: 700;
    }

    /* Footer: Authorized Signatory only (Terms removed) */
    .footer-section {
      margin-top: 36px;
      padding-top: 20px;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
    }
    .sign-box {
      text-align: right;
      min-width: 220px;
    }
    .sign-line {
      width: 180px;
      border-top: 1px solid #4b5563;
      margin-left: auto;
      margin-bottom: 8px;
    }
    .sign-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #111827;
    }
    .sign-subtitle {
      font-size: 12px;
      color: #4b5563;
      margin-top: 2px;
    }

    @media print {
      body {
        background: #ffffff;
      }
      .invoice-container {
        padding: 0;
        width: 100%;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 56%; padding-right: 16px;">
          ${compLogo ? `<img src="${compLogo}" alt="Company Logo" class="company-logo" />` : ''}
          <div class="company-name">${escapeHtml(compName)}</div>
          ${compTagline ? `<div class="company-tagline">${escapeHtml(compTagline)}</div>` : ''}
          <div class="company-info">
            ${compAddress ? `<div>${escapeHtml(compAddress)}</div>` : ''}
            ${compPhone ? `<div><strong>Phone:</strong> ${escapeHtml(compPhone)}</div>` : ''}
            ${compEmail ? `<div><strong>Email:</strong> ${escapeHtml(compEmail)}</div>` : ''}
            ${isGst && compGstin ? `<div><strong>GSTIN:</strong> ${escapeHtml(compGstin)}</div>` : ''}
            ${compPan ? `<div><strong>PAN:</strong> ${escapeHtml(compPan)}</div>` : ''}
          </div>
        </td>
        <td style="width: 44%;">
          <div class="doc-title-block">
            <div class="doc-badge">${escapeHtml(docTitle)}</div>
            <div>
              <span class="doc-type-sub">${isGst ? 'GST Compliant' : 'Non-GST Bill'}</span>
            </div>
            <table class="doc-meta-table">
              <tr>
                <td class="doc-meta-label">${docNumberLabel}</td>
                <td class="doc-meta-val">${escapeHtml(invoice.doc_number)}</td>
              </tr>
              <tr>
                <td class="doc-meta-label">${dateLabel}</td>
                <td class="doc-meta-val">${formatDate(invoice.issue_date)}</td>
              </tr>
              ${invoice.due_date ? `
              <tr>
                <td class="doc-meta-label">${dueDateLabel}</td>
                <td class="doc-meta-val">${formatDate(invoice.due_date)}</td>
              </tr>` : ''}
              <tr>
                <td class="doc-meta-label">Status:</td>
                <td class="doc-meta-val" style="text-transform: capitalize;">${escapeHtml(invoice.status || 'Draft')}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    </table>

    <div class="divider"></div>

    <!-- Client / Bill To -->
    <table class="bill-to-grid">
      <tr>
        <td class="bill-to-box">
          <div class="section-label">Bill To / Client Details</div>
          <div class="client-title">${escapeHtml(invoice.client_name)}</div>
          ${invoice.client_company ? `<div class="client-company">${escapeHtml(invoice.client_company)}</div>` : ''}
          <div class="client-detail-text">
            ${invoice.client_address ? `<div>${escapeHtml(invoice.client_address)}</div>` : ''}
            ${(invoice.client_city || invoice.client_state || invoice.client_pincode) ? `
              <div>${[invoice.client_city, invoice.client_state, invoice.client_pincode].filter(Boolean).map(escapeHtml).join(', ')}</div>
            ` : ''}
            ${invoice.client_phone ? `<div><strong>Phone:</strong> ${escapeHtml(invoice.client_phone)}</div>` : ''}
            ${invoice.client_email ? `<div><strong>Email:</strong> ${escapeHtml(invoice.client_email)}</div>` : ''}
            ${isGst && invoice.client_gstin ? `<div><strong>Client GSTIN:</strong> ${escapeHtml(invoice.client_gstin)}</div>` : ''}
          </div>
        </td>
        <td class="bank-quick-box">
          <div class="section-label">IT Services Billing</div>
          <div style="font-size: 13px; color: #374151; line-height: 1.55;">
            <div><strong>Billing Type:</strong> ${isGst ? 'GST Invoice' : 'Non-GST Service Bill'}</div>
            <div><strong>Currency:</strong> ${escapeHtml(currencySymbol)} INR</div>
            ${isGst ? `<div><strong>SAC Code:</strong> 9983 (IT Services)</div>` : ''}
            ${cleanedNotes ? `<div style="margin-top: 8px; font-style: italic; color: #4b5563; border-top: 1px dashed #d1d5db; padding-top: 6px;">"${escapeHtml(cleanedNotes)}"</div>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- Services Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 6%;" class="text-center">#</th>
          <th style="width: ${isGst ? '48%' : '58%'};">Service Description</th>
          ${isGst ? `<th style="width: 12%;" class="text-center">SAC Code</th>` : ''}
          <th style="width: 10%;" class="text-center">Qty</th>
          <th style="width: 12%;" class="text-right">Charge</th>
          <th style="width: 14%;" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => `
          <tr>
            <td class="text-center" style="color: #4b5563;">${idx + 1}</td>
            <td>
              <div class="service-name">${escapeHtml(item.service_title)}</div>
              ${item.description ? `<div class="service-desc">${escapeHtml(item.description)}</div>` : ''}
            </td>
            ${isGst ? `<td class="text-center"><span class="sac-badge">${escapeHtml(item.sac_code || '998314')}</span></td>` : ''}
            <td class="text-center">${item.qty || 1}</td>
            <td class="text-right">${formatCurrency(item.rate || 0, currencySymbol)}</td>
            <td class="text-right" style="font-weight: 700; color: #111827;">${formatCurrency(item.amount || 0, currencySymbol)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Financials & Bank Details -->
    <table class="bottom-section">
      <tr>
        <td class="bank-and-words">
          <!-- Total in words -->
          <div class="words-box">
            <div class="words-title">Grand Total in Words</div>
            <div class="words-text">${escapeHtml(invoice.grand_total_in_words || 'Zero Rupees Only')}</div>
          </div>

          <!-- Company Bank Account Details -->
          ${hasBankDetails ? `
          <div class="bank-card">
            <div class="bank-title">Company Bank Account Details</div>
            <table class="bank-table">
              <tbody>
                ${bankName ? `<tr><td class="bank-lbl">Bank Name:</td><td class="bank-v">${escapeHtml(bankName)}</td></tr>` : ''}
                ${bankHolder ? `<tr><td class="bank-lbl">Account Name:</td><td class="bank-v">${escapeHtml(bankHolder)}</td></tr>` : ''}
                ${bankAccount ? `<tr><td class="bank-lbl">Account No:</td><td class="bank-v">${escapeHtml(bankAccount)}</td></tr>` : ''}
                ${bankIfsc ? `<tr><td class="bank-lbl">IFSC Code:</td><td class="bank-v">${escapeHtml(bankIfsc)}</td></tr>` : ''}
                ${bankBranch ? `<tr><td class="bank-lbl">Branch:</td><td class="bank-v">${escapeHtml(bankBranch)}</td></tr>` : ''}
                ${bankUpi ? `<tr><td class="bank-lbl">UPI ID:</td><td class="bank-v">${escapeHtml(bankUpi)}</td></tr>` : ''}
              </tbody>
            </table>
          </div>
          ` : ''}
        </td>

        <td class="totals-box">
          <table class="totals-table">
            <tr>
              <td class="totals-label">Subtotal:</td>
              <td class="totals-val">${formatCurrency(invoice.subtotal || 0, currencySymbol)}</td>
            </tr>
            ${parseFloat(invoice.discount_amount) > 0 ? `
            <tr>
              <td class="totals-label">Discount ${invoice.discount_rate > 0 ? `(${invoice.discount_rate}%)` : ''}:</td>
              <td class="totals-val" style="color: #dc2626;">-${formatCurrency(invoice.discount_amount, currencySymbol)}</td>
            </tr>
            <tr>
              <td class="totals-label">Taxable Amount:</td>
              <td class="totals-val">${formatCurrency((invoice.subtotal || 0) - (invoice.discount_amount || 0), currencySymbol)}</td>
            </tr>` : ''}

            ${isGst ? `
              ${invoice.tax_type === 'igst' ? `
                <tr>
                  <td class="totals-label">IGST (${invoice.gst_rate || 18}%):</td>
                  <td class="totals-val">${formatCurrency(invoice.igst_amount || invoice.total_tax || 0, currencySymbol)}</td>
                </tr>
              ` : `
                <tr>
                  <td class="totals-label">CGST (${(invoice.gst_rate || 18) / 2}%):</td>
                  <td class="totals-val">${formatCurrency(invoice.cgst_amount || 0, currencySymbol)}</td>
                </tr>
                <tr>
                  <td class="totals-label">SGST (${(invoice.gst_rate || 18) / 2}%):</td>
                  <td class="totals-val">${formatCurrency(invoice.sgst_amount || 0, currencySymbol)}</td>
                </tr>
              `}
              <tr>
                <td class="totals-label" style="color: #1e3a8a; font-weight: 700; border-top: 1px solid #e5e7eb;">Total GST:</td>
                <td class="totals-val" style="color: #1e3a8a; border-top: 1px solid #e5e7eb;">${formatCurrency(invoice.total_tax || 0, currencySymbol)}</td>
              </tr>
            ` : `
              <tr>
                <td class="totals-label" colspan="2" style="font-size: 11.5px; color: #047857; background: #ecfdf5; text-align: center; font-weight: 700;">
                  ✓ Non-GST Bill (Zero Tax Applied)
                </td>
              </tr>
            `}

            <tr class="grand-total-row">
              <td>Grand Total:</td>
              <td class="totals-val">${formatCurrency(invoice.grand_total || 0, currencySymbol)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Footer: Authorized Signatory only -->
    <div class="footer-section">
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-title">For ${escapeHtml(compName)}</div>
        <div class="sign-subtitle">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  generateInvoiceHtml
};
