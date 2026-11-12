/**
 * @file billingCalculator.js
 * @description IT Service catalog, pricing, tax, and total calculation engine.
 * Supports both GST and Non-GST bill computations according to Indian IT service billing standards.
 */

const { numberToWords } = require('../utils/numberToWords');

// Standard Indian IT Service Catalog with standard HSN/SAC codes
const IT_SERVICES_CATALOG = [
  {
    title: 'Website Development',
    sac_code: '998314',
    description: 'Custom responsive web application design, frontend architecture, and deployment.'
  },
  {
    title: 'Mobile App Development',
    sac_code: '998314',
    description: 'Native or cross-platform iOS & Android mobile application development and publishing.'
  },
  {
    title: 'Custom Software Development',
    sac_code: '998314',
    description: 'Bespoke enterprise software architecture, business logic implementation, and API integration.'
  },
  {
    title: 'UI/UX Design & Prototyping',
    sac_code: '998314',
    description: 'User research, wireframing, high-fidelity Figma mockups, and responsive component library.'
  },
  {
    title: 'Digital Marketing & PPC Campaign',
    sac_code: '998313',
    description: 'Targeted multi-channel ad campaign management, performance analytics, and conversion optimization.'
  },
  {
    title: 'Search Engine Optimization (SEO)',
    sac_code: '998313',
    description: 'Technical SEO audit, on-page optimization, content strategy, keyword research, and SERP monitoring.'
  },
  {
    title: 'Cloud Architecture & DevOps Setup',
    sac_code: '998315',
    description: 'Cloud infrastructure provisioning (AWS/GCP/Azure), CI/CD pipelines, containerization, and monitoring.'
  },
  {
    title: 'API Integration & Backend Architecture',
    sac_code: '998314',
    description: 'RESTful/GraphQL API design, database schema optimization, microservices, and security audits.'
  },
  {
    title: 'Website Maintenance & Support',
    sac_code: '998313',
    description: 'Monthly SLA uptime monitoring, security patches, regular backups, and feature enhancements.'
  },
  {
    title: 'QA & Software Testing',
    sac_code: '998316',
    description: 'Manual and automated regression, load, unit, and end-to-end software quality assurance.'
  },
  {
    title: 'Cybersecurity & Code Audit',
    sac_code: '998319',
    description: 'Vulnerability assessment, penetration testing, compliance checks, and secure code review.'
  },
  {
    title: 'E-Commerce Solution Development',
    sac_code: '998314',
    description: 'Full-featured online store setup, payment gateway integrations, catalog, and order management.'
  }
];

/**
 * Calculates all totals, taxes, and amounts in words for an invoice or quotation
 * @param {Object} data 
 * @returns {Object} Calculated financials
 */
function calculateInvoiceFinancials(data) {
  const billType = data.bill_type === 'non_gst' ? 'non_gst' : 'gst';
  const rawItems = Array.isArray(data.items) ? data.items : [];

  // Normalize items
  let subtotal = 0;
  const items = rawItems.map((item, index) => {
    const qty = Math.max(1, parseFloat(item.qty || 1));
    const rate = Math.max(0, parseFloat(item.rate || item.charge || 0));
    const amount = Math.round((qty * rate) * 100) / 100;
    subtotal += amount;

    return {
      id: item.id || index + 1,
      service_title: (item.service_title || item.title || 'IT Service').trim(),
      description: (item.description || '').trim(),
      sac_code: item.sac_code || (billType === 'gst' ? '998314' : ''),
      qty,
      unit: item.unit || 'Service',
      rate,
      amount
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;

  // Discount calculation
  let discountAmount = 0;
  const discountRate = parseFloat(data.discount_rate || 0);
  if (discountRate > 0) {
    discountAmount = Math.round(((subtotal * discountRate) / 100) * 100) / 100;
  } else if (parseFloat(data.discount_amount || 0) > 0) {
    discountAmount = Math.min(subtotal, parseFloat(data.discount_amount));
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Tax calculation
  let taxType = 'none';
  let gstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalTax = 0;

  if (billType === 'gst') {
    gstRate = parseFloat(data.gst_rate !== undefined ? data.gst_rate : 18);
    // Determine tax structure: intra-state (cgst + sgst) or inter-state (igst)
    // Default to intra-state unless specified as igst or client state differs from company state
    const requestedTaxType = data.tax_type;
    if (requestedTaxType === 'igst') {
      taxType = 'igst';
      igstAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
      totalTax = igstAmount;
    } else {
      taxType = 'cgst_sgst';
      const halfRate = gstRate / 2;
      cgstAmount = Math.round(((taxableAmount * halfRate) / 100) * 100) / 100;
      sgstAmount = Math.round(((taxableAmount * halfRate) / 100) * 100) / 100;
      totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;
    }
  }

  const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100;
  const currencyCode = data.currency_code || 'INR';
  const grandTotalInWords = numberToWords(grandTotal, currencyCode === 'INR' ? 'Rupees' : 'Dollars');

  return {
    bill_type: billType,
    items,
    subtotal,
    discount_rate: discountRate,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    tax_type: taxType,
    gst_rate: gstRate,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    total_tax: totalTax,
    grand_total: grandTotal,
    grand_total_in_words: grandTotalInWords
  };
}

module.exports = {
  IT_SERVICES_CATALOG,
  calculateInvoiceFinancials
};

