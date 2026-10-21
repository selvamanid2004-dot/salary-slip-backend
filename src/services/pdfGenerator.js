/**
 * @file pdfGenerator.js
 * @description Generates clean, print-ready HTML for salary slips.
 * Strictly includes:
 * Company Details:
 * - Company Name
 * - Address
 * - Mobile Number
 * - Company Logo (increased size)
 *
 * Employee Details:
 * - Employee Name
 * - Employee ID
 * - Department
 * - Role
 * - Salary Days
 *
 * Salary Breakdown:
 * - Basic Salary
 * - HRA
 * - Conveyance Allowance
 *
 * Slip Number and signature sections are removed.
 */

const { formatCurrency } = require('../utils/currencyFormatter');
const { getMonthName } = require('./payrollCalculator');

/**
 * Escapes special HTML characters to prevent XSS injection
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds standard print-ready HTML for a salary slip
 */
function generateSalarySlipHtml(payroll, employee, company) {
  const monthName = getMonthName(payroll.month);
  const currencySymbol = escapeHtml(company?.currency_symbol || '₹');

  const rawEmpName = employee?.employee_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || payroll.employee_name || 'Employee';
  const rawEmpRole = employee?.role || employee?.designation || payroll.role || payroll.designation || 'Staff';
  const rawEmpId = employee?.employee_code || payroll.employee_code || '';
  const rawEmpDept = employee?.department || payroll.department || 'General';

  const empName = escapeHtml(rawEmpName);
  const empRole = escapeHtml(rawEmpRole);
  const empId = escapeHtml(rawEmpId);
  const empDept = escapeHtml(rawEmpDept);

  const salaryDays = Number(
    payroll.salary_days !== undefined
      ? payroll.salary_days
      : payroll.days_worked !== undefined
      ? payroll.days_worked
      : payroll.total_working_days || 30
  );

  // 3 Salary Components
  const basicAmount = Number(payroll.basic_pay) || 0;
  const hraAmount = Number(payroll.hra_pay !== undefined ? payroll.hra_pay : payroll.rent_pay) || 0;
  const conveyanceAmount = Number(payroll.conveyance_pay !== undefined ? payroll.conveyance_pay : payroll.medical_pay) || 0;
  const grossEarnings = basicAmount + hraAmount + conveyanceAmount;
  const totalDeductions = Number(payroll.total_deductions) || 0;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  const companyName = escapeHtml(company?.company_name || 'WorkPulse Inc.');
  const companyAddress = escapeHtml(company?.address || company?.address_line1 || 'Company Address');
  const companyMobile = escapeHtml(company?.mobile_number || company?.phone || '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Salary Slip - ${empName} (${monthName} ${payroll.year})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      background: #f8fafc;
      color: #0f172a;
      padding: 24px;
      font-size: 13px;
    }

    .slip-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .company-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }

    .company-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .company-logo {
      max-height: 84px;
      max-width: 220px;
      object-fit: contain;
    }

    .company-details h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    .company-details p {
      color: #475569;
      font-size: 12px;
      line-height: 1.4;
      margin: 2px 0;
    }

    .slip-meta {
      text-align: right;
    }

    .slip-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .slip-meta p {
      font-size: 12px;
      color: #0f172a;
      font-weight: 700;
    }

    .emp-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .emp-field {
      display: flex;
      flex-direction: column;
    }

    .emp-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .emp-val {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .salary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .salary-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
    }

    .salary-table td {
      padding: 10px 14px;
      font-size: 12px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    .salary-table .num-col {
      text-align: right;
      font-weight: 600;
    }

    .total-row td {
      background: #f8fafc;
      font-weight: 700;
      font-size: 12px;
      border-top: 2px solid #cbd5e1;
    }

    .net-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .net-title {
      font-size: 13px;
      font-weight: 700;
      color: #166534;
      text-transform: uppercase;
    }

    .net-words {
      font-size: 11px;
      color: #15803d;
      margin-top: 3px;
      font-style: italic;
    }

    .net-amount {
      font-size: 22px;
      font-weight: 800;
      color: #166534;
    }

    .confidential-notice {
      text-align: center;
      margin-top: 20px;
      font-size: 10px;
      color: #94a3b8;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .slip-container {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <!-- Company Details Header -->
    <div class="company-header">
      <div class="company-info">
        ${company?.logo_url ? `<img src="${company.logo_url}" alt="Company Logo" class="company-logo" />` : ''}
        <div class="company-details">
          <h1>${companyName}</h1>
          <p><strong>Address:</strong> ${companyAddress}</p>
          ${companyMobile ? `<p><strong>Mobile Number:</strong> ${companyMobile}</p>` : ''}
        </div>
      </div>
      <div class="slip-meta">
        <div class="slip-badge">Salary Slip</div>
        <p>${monthName} ${payroll.year}</p>
      </div>
    </div>

    <!-- Employee Details (Employee Name, Employee ID, Department, Role, Salary Days) -->
    <div class="emp-grid">
      <div class="emp-field">
        <span class="emp-label">Employee Name</span>
        <span class="emp-val">${empName}</span>
      </div>
      <div class="emp-field">
        <span class="emp-label">Employee ID</span>
        <span class="emp-val">${empId}</span>
      </div>
      <div class="emp-field">
        <span class="emp-label">Department</span>
        <span class="emp-val">${empDept}</span>
      </div>
      <div class="emp-field">
        <span class="emp-label">Role</span>
        <span class="emp-val">${empRole}</span>
      </div>
      <div class="emp-field">
        <span class="emp-label">Salary Days</span>
        <span class="emp-val">${salaryDays} Days</span>
      </div>
    </div>

    <!-- Salary Structure Table (strictly: Basic Salary, HRA, Conveyance Allowance) -->
    <table class="salary-table">
      <thead>
        <tr>
          <th style="width: 60%; text-align: left;">Salary Structure Component</th>
          <th style="width: 40%; text-align: right;">Amount (${currencySymbol})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Basic Salary</td>
          <td class="num-col">${formatCurrency(basicAmount, '', 'en-IN')}</td>
        </tr>
        <tr>
          <td>HRA</td>
          <td class="num-col">${formatCurrency(hraAmount, '', 'en-IN')}</td>
        </tr>
        <tr>
          <td>Conveyance Allowance</td>
          <td class="num-col">${formatCurrency(conveyanceAmount, '', 'en-IN')}</td>
        </tr>
        <tr class="total-row">
          <td><strong>Total Gross Earnings</strong></td>
          <td class="num-col"><strong>${formatCurrency(grossEarnings, currencySymbol, 'en-IN')}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Net Take-Home Salary Banner -->
    <div class="net-banner">
      <div>
        <div class="net-title">Net Take-Home Salary</div>
        <div class="net-words">${payroll.net_salary_in_words || `${formatCurrency(netSalary, currencySymbol, 'en-IN')} Only`}</div>
      </div>
      <div class="net-amount">${formatCurrency(netSalary, currencySymbol, 'en-IN')}</div>
    </div>

    <div class="confidential-notice">
      This is a computer-generated salary slip.
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  generateSalarySlipHtml
};
