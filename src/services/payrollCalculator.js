/**
 * @file payrollCalculator.js
 * @description Core business logic service for payroll computations.
 * Calculates pro-rated earnings for Basic Salary, Rent Allowance, and Medical Allowance.
 */

const { roundTwoDecimals } = require('../utils/currencyFormatter');
const { numberToWords } = require('../utils/numberToWords');

/**
 * Calculates a complete monthly salary slip breakdown
 * @param {Object} employee - Employee master record containing salary components (basic_salary, rent_allowance, medical_allowance)
 * @param {Object} payrollInput - Specific month parameters (month, year, days_worked, total_days, other_deductions)
 * @returns {Object} Calculated payroll breakdown
 */
function calculatePayroll(employee, payrollInput) {
  const salaryDaysInput = Number(
    payrollInput.salary_days !== undefined
      ? payrollInput.salary_days
      : payrollInput.working_days !== undefined
      ? payrollInput.working_days
      : payrollInput.days_worked
  );
  const totalDays = Number(payrollInput.total_days) || Math.max(30, !isNaN(salaryDaysInput) && salaryDaysInput > 0 ? salaryDaysInput : 30);
  const daysWorked = !isNaN(salaryDaysInput) ? salaryDaysInput : totalDays;
  const paidLeaves = Number(payrollInput.paid_leaves) || 0;
  const unpaidLeaves = Number(payrollInput.unpaid_leaves) !== undefined && Number(payrollInput.unpaid_leaves) > 0
    ? Number(payrollInput.unpaid_leaves)
    : Math.max(0, totalDays - daysWorked - paidLeaves);

  // Payable days cannot exceed total working days
  const payableDays = Math.min(totalDays, daysWorked + paidLeaves);
  const prorationRatio = totalDays > 0 ? payableDays / totalDays : 1;

  // 3 Salary Structure components: Basic Salary, HRA, Conveyance Allowance
  const baseBasic = Number(employee.basic_salary) || 0;
  const baseHra = Number(employee.hra !== undefined ? employee.hra : employee.rent_allowance) || 0;
  const baseConveyance = Number(employee.conveyance_allowance !== undefined ? employee.conveyance_allowance : employee.medical_allowance) || 0;

  // Pro-rated earnings based on Salary Days
  const basicPay = roundTwoDecimals(baseBasic * prorationRatio);
  const hraPay = roundTwoDecimals(baseHra * prorationRatio);
  const conveyancePay = roundTwoDecimals(baseConveyance * prorationRatio);

  // Total Gross Earnings
  const grossEarnings = roundTwoDecimals(basicPay + hraPay + conveyancePay);

  // Deductions
  const otherDeductions = roundTwoDecimals(Number(payrollInput.other_deductions) || 0);
  const totalDeductions = otherDeductions;

  // Net Salary
  const netSalary = Math.max(0, roundTwoDecimals(grossEarnings - totalDeductions));
  const netSalaryInWords = numberToWords(netSalary);

  // Unique Slip Number: SLIP-YYYYMM-EMPID-RANDOM
  const paddedMonth = String(payrollInput.month).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const slipNumber = `SLIP-${payrollInput.year}${paddedMonth}-${employee.id}-${randomSuffix}`;

  return {
    slip_number: slipNumber,
    employee_id: employee.id,
    month: Number(payrollInput.month),
    year: Number(payrollInput.year),
    payment_date: payrollInput.payment_date || new Date().toISOString().slice(0, 10),
    salary_days: daysWorked,
    total_working_days: totalDays,
    days_worked: daysWorked,
    paid_leaves: paidLeaves,
    unpaid_leaves: unpaidLeaves,
    
    // Earnings: Strictly Basic Salary, HRA, Conveyance Allowance
    basic_pay: basicPay,
    hra_pay: hraPay,
    conveyance_pay: conveyancePay,
    rent_pay: hraPay,
    medical_pay: 0,
    special_allowance_pay: 0,
    bonus: 0,
    overtime_pay: 0,
    gross_earnings: grossEarnings,

    // Deductions
    pf_deduction: 0,
    professional_tax_deduction: 0,
    tds_tax_deduction: 0,
    esi_deduction: 0,
    other_deductions: otherDeductions,
    total_deductions: totalDeductions,

    // Net
    net_salary: netSalary,
    net_salary_in_words: netSalaryInWords,

    // Status
    payment_status: payrollInput.payment_status || 'Paid',
    payment_method: payrollInput.payment_method || 'Bank Transfer',
    remarks: payrollInput.remarks || `${getMonthName(payrollInput.month)} ${payrollInput.year} Payroll`
  };
}

function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[Number(monthNumber) - 1] || 'Month';
}

module.exports = {
  calculatePayroll,
  getMonthName
};
