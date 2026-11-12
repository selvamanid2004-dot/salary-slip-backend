/**
 * @file invoiceHtmlGenerator.js
 * @description Generates clean, modern, print-ready HTML for IT Company Invoices and Quotations.
 * Optimized for A4 printing and PDF generation with clear visual hierarchy.
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
  const compName = invoice.company_name || company?.company_name || 'IT Services Provider';
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(docTitle)} - ${escapeHtml(invoice.doc_number)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-container {
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 32px;
      background: #ffffff;
    }

    /* Top Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      vertical-align: top;
    }
    .company-logo {
      max-height: 70px;
      max-width: 220px;
      object-fit: contain;
      margin-bottom: 8px;
    }
    .company-name {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .company-tagline {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      margin-top: 1px;
    }
    .company-info {
      font-size: 12px;
      color: #475569;
      margin-top: 6px;
      line-height: 1.45;
    }
    .doc-title-block {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: ${isGst ? '#1e40af' : '#047857'};
      padding-bottom: 4px;
      text-transform: uppercase;
    }
    .doc-type-sub {
      display: inline-block;
      background: ${isGst ? '#eff6ff' : '#ecfdf5'};
      color: ${isGst ? '#1d4ed8' : '#065f46'};
      border: 1px solid ${isGst ? '#bfdbfe' : '#a7f3d0'};
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .doc-meta-table {
      margin-top: 10px;
      margin-left: auto;
      border-collapse: collapse;
      font-size: 12px;
    }
    .doc-meta-table td {
      padding: 2px 6px;
    }
    .doc-meta-label {
      color: #64748b;
      font-weight: 600;
      text-align: right;
    }
    .doc-meta-val {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }

    .divider {
      height: 2px;
      background: #e2e8f0;
      margin: 16px 0 20px 0;
    }

    /* Client and Billing Information */
    .bill-to-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .bill-to-box {
      width: 58%;
      vertical-align: top;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .bank-quick-box {
      width: 38%;
      vertical-align: top;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .section-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }
    .client-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .client-company {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-top: 2px;
    }
    .client-detail-text {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.45;
    }

    /* IT Services Line Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 9px 12px;
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
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 12.5px;
    }
    .items-table tr:nth-child(even) td {
      background-color: #fafbfd;
    }
    .service-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 13px;
    }
    .service-desc {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 3px;
      white-space: pre-line;
    }
    .sac-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      padding: 1px 5px;
      border-radius: 3px;
      margin-top: 4px;
    }

    /* Financials & Calculation section */
    .bottom-section {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .bottom-section td {
      vertical-align: top;
    }
    .bank-and-words {
      width: 58%;
      padding-right: 18px;
    }
    .totals-box {
      width: 42%;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-table td {
      padding: 7px 14px;
      font-size: 12.5px;
    }
    .totals-label {
      color: #64748b;
      font-weight: 600;
    }
    .totals-val {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
    }
    .grand-total-row td {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 800;
    }
    .grand-total-row .totals-val {
      color: #ffffff;
      font-size: 16px;
    }

    /* Words Box */
    .words-box {
      background: #f1f5f9;
      border-left: 4px solid #3b82f6;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 14px;
    }
    .words-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
    }
    .words-text {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }

    /* Bank Account Block */
    .bank-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f8fafc;
      margin-bottom: 14px;
    }
    .bank-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1e40af;
      margin-bottom: 6px;
    }
    .bank-grid {
      display: grid;
      grid-template-columns: 110px 1fr;
      row-gap: 3px;
      font-size: 11.5px;
    }
    .bank-lbl {
      color: #64748b;
      font-weight: 600;
    }
    .bank-v {
      color: #0f172a;
      font-weight: 700;
    }

    /* Footer & Terms */
    .footer-section {
      margin-top: 26px;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .terms-box {
      font-size: 11px;
      color: #64748b;
      max-width: 60%;
      line-height: 1.45;
    }
    .terms-title {
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .sign-box {
      text-align: right;
      min-width: 180px;
    }
    .sign-line {
      width: 160px;
      border-top: 1px solid #94a3b8;
      margin-left: auto;
      margin-bottom: 6px;
    }
    .sign-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .sign-subtitle {
      font-size: 10px;
      color: #64748b;
    }

    @media print {
      body {
        background: #ffffff;
      }
      .invoice-container {
        padding: 0;
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
        <td style="width: 55%;">
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
        <td style="width: 45%;">
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
        <td style="width: 4%;"></td>
        <td class="bank-quick-box">
          <div class="section-label">IT Services Billing</div>
          <div style="font-size: 12px; color: #475569; line-height: 1.5;">
            <div><strong>Billing Type:</strong> ${isGst ? 'GST Invoice' : 'Non-GST Service Bill'}</div>
            <div><strong>Currency:</strong> ${escapeHtml(currencySymbol)} INR</div>
            ${isGst ? `<div><strong>SAC Code:</strong> 9983 (IT Services)</div>` : ''}
            ${invoice.notes ? `<div style="margin-top: 6px; font-style: italic;">${escapeHtml(invoice.notes)}</div>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- Services Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;" class="text-center">#</th>
          <th style="width: 50%;">Service Description</th>
          ${isGst ? `<th style="width: 12%;" class="text-center">SAC Code</th>` : ''}
          <th style="width: 10%;" class="text-center">Qty</th>
          <th style="width: 13%;" class="text-right">Charge</th>
          <th style="width: 15%;" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => `
          <tr>
            <td class="text-center" style="color: #64748b;">${idx + 1}</td>
            <td>
              <div class="service-name">${escapeHtml(item.service_title)}</div>
              ${item.description ? `<div class="service-desc">${escapeHtml(item.description)}</div>` : ''}
            </td>
            ${isGst ? `<td class="text-center"><span class="sac-badge">${escapeHtml(item.sac_code || '998314')}</span></td>` : ''}
            <td class="text-center">${item.qty || 1}</td>
            <td class="text-right">${currencySymbol}${formatCurrency(item.rate || 0)}</td>
            <td class="text-right" style="font-weight: 700; color: #0f172a;">${currencySymbol}${formatCurrency(item.amount || 0)}</td>
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
            <div class="bank-grid">
              ${bankName ? `<div class="bank-lbl">Bank Name:</div><div class="bank-v">${escapeHtml(bankName)}</div>` : ''}
              ${bankHolder ? `<div class="bank-lbl">Account Name:</div><div class="bank-v">${escapeHtml(bankHolder)}</div>` : ''}
              ${bankAccount ? `<div class="bank-lbl">Account No:</div><div class="bank-v">${escapeHtml(bankAccount)}</div>` : ''}
              ${bankIfsc ? `<div class="bank-lbl">IFSC Code:</div><div class="bank-v">${escapeHtml(bankIfsc)}</div>` : ''}
              ${bankBranch ? `<div class="bank-lbl">Branch:</div><div class="bank-v">${escapeHtml(bankBranch)}</div>` : ''}
              ${bankUpi ? `<div class="bank-lbl">UPI ID:</div><div class="bank-v">${escapeHtml(bankUpi)}</div>` : ''}
            </div>
          </div>
          ` : ''}
        </td>

        <td class="totals-box">
          <table class="totals-table">
            <tr>
              <td class="totals-label">Subtotal:</td>
              <td class="totals-val">${currencySymbol}${formatCurrency(invoice.subtotal || 0)}</td>
            </tr>
            ${parseFloat(invoice.discount_amount) > 0 ? `
            <tr>
              <td class="totals-label">Discount ${invoice.discount_rate > 0 ? `(${invoice.discount_rate}%)` : ''}:</td>
              <td class="totals-val" style="color: #ef4444;">-${currencySymbol}${formatCurrency(invoice.discount_amount)}</td>
            </tr>
            <tr>
              <td class="totals-label">Taxable Amount:</td>
              <td class="totals-val">${currencySymbol}${formatCurrency((invoice.subtotal || 0) - (invoice.discount_amount || 0))}</td>
            </tr>` : ''}

            ${isGst ? `
              ${invoice.tax_type === 'igst' ? `
                <tr>
                  <td class="totals-label">IGST (${invoice.gst_rate || 18}%):</td>
                  <td class="totals-val">${currencySymbol}${formatCurrency(invoice.igst_amount || invoice.total_tax || 0)}</td>
                </tr>
              ` : `
                <tr>
                  <td class="totals-label">CGST (${(invoice.gst_rate || 18) / 2}%):</td>
                  <td class="totals-val">${currencySymbol}${formatCurrency(invoice.cgst_amount || 0)}</td>
                </tr>
                <tr>
                  <td class="totals-label">SGST (${(invoice.gst_rate || 18) / 2}%):</td>
                  <td class="totals-val">${currencySymbol}${formatCurrency(invoice.sgst_amount || 0)}</td>
                </tr>
              `}
              <tr>
                <td class="totals-label">Total GST Tax:</td>
                <td class="totals-val">${currencySymbol}${formatCurrency(invoice.total_tax || 0)}</td>
              </tr>
            ` : `
              <tr>
                <td class="totals-label" colspan="2" style="font-size: 11px; color: #059669; background: #ecfdf5; text-align: center;">
                  ✓ Non-GST Bill (Zero Tax Applied)
                </td>
              </tr>
            `}

            <tr class="grand-total-row">
              <td>Grand Total:</td>
              <td class="totals-val">${currencySymbol}${formatCurrency(invoice.grand_total || 0)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Footer Terms & Signature -->
    <div class="footer-section">
      <div class="terms-box">
        <div class="terms-title">Terms &amp; Conditions:</div>
        <div>${escapeHtml(invoice.terms || '1. Payments should be made to the designated bank account only.\n2. Please mention the invoice number in the payment description.\n3. This is a computer-generated document.')}</div>
      </div>
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

