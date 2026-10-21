/**
 * @file payrollController.js
 * @description Controller handling Payroll and Salary Slip operations,
 * calculation simulations, persistence, and print/HTML exports.
 */

const PayrollModel = require('../models/Payroll');
const EmployeeModel = require('../models/Employee');
const CompanyModel = require('../models/Company');
const { calculatePayroll, getMonthName } = require('../services/payrollCalculator');
const { generateSalarySlipHtml } = require('../services/pdfGenerator');
const { numberToWords } = require('../utils/numberToWords');
const logger = require('../utils/logger');

/**
 * GET /api/payroll
 * Retrieves all salary slips with optional month, year, or employee filters
 */
const getPayrolls = async (req, res, next) => {
  try {
    const { month, year, employee_id, status } = req.query;
    const payrolls = await PayrollModel.getAll({ month, year, employee_id, status });
    res.json({
      success: true,
      count: payrolls.length,
      data: payrolls
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/my-slips
 * Retrieves all issued salary slips for the currently authenticated employee
 */
const getMyPayrolls = async (req, res, next) => {
  try {
    const employeeId = req.user?.employee_id || req.query.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No associated employee record found for this user account.'
      });
    }

    const slips = await PayrollModel.getAll({ employee_id: employeeId });
    res.json({
      success: true,
      count: slips.length,
      data: slips
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/:id
 * Retrieves a single salary slip by ID
 */
const getPayrollById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slip = await PayrollModel.getById(id);
    if (!slip) {
      return res.status(404).json({
        success: false,
        message: `Salary slip with ID ${id} not found`
      });
    }

    const company = await CompanyModel.get();

    res.json({
      success: true,
      data: {
        ...slip,
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payroll/preview
 * Previews salary calculation and checks if a locked payslip is already issued
 */
const previewPayroll = async (req, res, next) => {
  try {
    const { employee_id, month, year } = req.body;
    const employee = await EmployeeModel.getById(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employee_id} not found`
      });
    }

    const m = Number(month);
    const y = Number(year);
    const existing = (m && y) ? await PayrollModel.getByEmployeeAndMonth(employee_id, m, y) : null;

    const calculation = calculatePayroll(employee, req.body);
    const company = await CompanyModel.get();

    res.json({
      success: true,
      data: {
        calculation,
        employee,
        company,
        is_already_issued: !!existing,
        existing_slip: existing || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payroll/generate
 * Issues a salary slip for the selected employee and saves it in the database.
 */
const generatePayroll = async (req, res, next) => {
  try {
    const { employee_id } = req.body;
    const employee = await EmployeeModel.getById(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employee_id} not found`
      });
    }

    // Perform accurate calculation based on employee structure and salary days
    const calculatedPayroll = calculatePayroll(employee, req.body);
    calculatedPayroll.is_locked = 1;
    calculatedPayroll.payment_status = 'Paid';

    // Save record to DB
    const savedSlip = await PayrollModel.create(calculatedPayroll);
    logger.info(`[Payroll] Successfully issued salary slip ${savedSlip.slip_number} for Employee ${employee.employee_code} (Month: ${savedSlip.month}/${savedSlip.year})`);

    const company = await CompanyModel.get();

    res.status(201).json({
      success: true,
      message: 'Salary slip successfully issued and saved in database',
      data: {
        ...savedSlip,
        employee,
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/:id/html
 * Renders print-ready HTML for the salary slip
 */
const getPayrollHtml = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slip = await PayrollModel.getById(id);
    if (!slip) {
      return res.status(404).send('Salary slip not found');
    }

    const employee = await EmployeeModel.getById(slip.employee_id);
    const company = await CompanyModel.get();

    const html = generateSalarySlipHtml(slip, employee, company);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/payroll/:id
 * Deletes a salary slip record
 */
const deletePayroll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slip = await PayrollModel.getById(id);
    if (!slip) {
      return res.status(404).json({
        success: false,
        message: `Salary slip with ID ${id} not found`
      });
    }

    await PayrollModel.delete(id);
    logger.info(`[Payroll] Deleted salary slip ID ${id} (${slip.slip_number})`);

    res.json({
      success: true,
      message: 'Salary slip deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payroll/bulk-generate
 * Issues payslips for multiple or all active employees in a single batch
 */
const bulkGeneratePayroll = async (req, res, next) => {
  try {
    const {
      month,
      year = new Date().getFullYear(),
      default_salary_days = 30,
      employee_ids,
      custom_days = {},
      payment_method = 'Bank Transfer'
    } = req.body;

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid month (1-12) is required'
      });
    }

    const allEmployees = await EmployeeModel.getAll({ status: 'Active' });
    let targetEmployees = allEmployees;

    if (Array.isArray(employee_ids) && employee_ids.length > 0) {
      const idSet = new Set(employee_ids.map(Number));
      targetEmployees = allEmployees.filter(e => idSet.has(Number(e.id)));
    }

    if (targetEmployees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active employees found to generate payslips for'
      });
    }

    const issuedSlips = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const emp of targetEmployees) {
      const days = custom_days[emp.id] !== undefined
        ? Number(custom_days[emp.id])
        : Number(default_salary_days);

      const calculated = calculatePayroll(emp, {
        month: Number(month),
        year: Number(year),
        salary_days: days,
        working_days: days,
        days_worked: days,
        total_days: 30,
        payment_method,
        payment_date: today
      });

      calculated.is_locked = 1;
      calculated.payment_status = 'Paid';

      const saved = await PayrollModel.create(calculated);
      issuedSlips.push({
        ...saved,
        employee: emp
      });
    }

    logger.info(`[Payroll] Bulk generated ${issuedSlips.length} salary slips for Month: ${month}/${year}`);

    res.status(201).json({
      success: true,
      message: `Successfully issued ${issuedSlips.length} salary slips for ${getMonthName(month)} ${year}`,
      count: issuedSlips.length,
      data: issuedSlips
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/export/csv
 * Exports payroll records as a formatted CSV file
 */
const exportPayrollCsv = async (req, res, next) => {
  try {
    const { month, year, employee_id, status } = req.query;
    const payrolls = await PayrollModel.getAll({ month, year, employee_id, status });

    const headers = [
      'Payslip Month',
      'Year',
      'Slip Number',
      'Employee Code',
      'Employee Name',
      'Department',
      'Role',
      'Salary Days',
      'Basic Salary (INR)',
      'HRA (INR)',
      'Conveyance Allowance (INR)',
      'Gross Earnings (INR)',
      'Net Salary (INR)',
      'Payment Status',
      'Payment Date'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = [headers.join(',')];

    for (const p of payrolls) {
      const basic = Number(p.basic_pay) || 0;
      const hra = Number(p.hra_pay !== undefined ? p.hra_pay : p.rent_pay) || 0;
      const conveyance = Number(p.conveyance_pay !== undefined ? p.conveyance_pay : p.medical_pay) || 0;
      const gross = Number(p.gross_earnings) || (basic + hra + conveyance);
      const net = Number(p.net_salary) || gross;
      const salaryDays = p.salary_days !== undefined ? p.salary_days : p.days_worked;

      rows.push([
        escapeCsv(getMonthName(p.month)),
        escapeCsv(p.year),
        escapeCsv(p.slip_number),
        escapeCsv(p.employee_code),
        escapeCsv(p.employee_name),
        escapeCsv(p.department || 'General'),
        escapeCsv(p.role || p.designation || 'Staff'),
        escapeCsv(salaryDays),
        basic.toFixed(2),
        hra.toFixed(2),
        conveyance.toFixed(2),
        gross.toFixed(2),
        net.toFixed(2),
        escapeCsv(p.payment_status || 'Paid'),
        escapeCsv(p.payment_date || '')
      ].join(','));
    }

    const csvContent = '\uFEFF' + rows.join('\r\n'); // Add UTF-8 BOM for Microsoft Excel compatibility
    const fileNameMonth = month ? `_${getMonthName(month)}` : '';
    const fileNameYear = year ? `_${year}` : '';
    const filename = `Payroll_Disbursements${fileNameMonth}${fileNameYear}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/summary/stats
 * Financial overview for payroll disbursements
 */
const getPayrollSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const summary = await PayrollModel.getSummary({ month, year });
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payroll/annual-statement
 * Generates an annual 12-month earnings summary statement for an employee
 */
const getAnnualSalaryStatement = async (req, res, next) => {
  try {
    const { employee_id, year } = req.query;
    if (!employee_id || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both employee_id and year.'
      });
    }

    const employee = await EmployeeModel.getById(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employee_id} not found.`
      });
    }

    const company = await CompanyModel.get();
    const slips = await PayrollModel.getAll({ employee_id: Number(employee_id), year: Number(year) });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    let totalDays = 0;
    let totalBasic = 0;
    let totalHra = 0;
    let totalConveyance = 0;
    let totalGross = 0;
    let totalNet = 0;
    let issuedMonthsCount = 0;

    const monthlyBreakdown = monthNames.map((mName, idx) => {
      const monthNum = idx + 1;
      const slip = slips.find(s => Number(s.month) === monthNum);

      if (slip) {
        const days = Number(slip.salary_days !== undefined ? slip.salary_days : slip.days_worked) || 0;
        const basic = Number(slip.basic_pay) || 0;
        const hra = Number(slip.hra_pay !== undefined ? slip.hra_pay : slip.rent_pay) || 0;
        const conveyance = Number(slip.conveyance_pay !== undefined ? slip.conveyance_pay : slip.medical_pay) || 0;
        const gross = basic + hra + conveyance;
        const net = Number(slip.net_salary) || gross;

        totalDays += days;
        totalBasic += basic;
        totalHra += hra;
        totalConveyance += conveyance;
        totalGross += gross;
        totalNet += net;
        issuedMonthsCount += 1;

        return {
          month: monthNum,
          month_name: mName,
          is_issued: true,
          slip_number: slip.slip_number,
          payment_date: slip.payment_date,
          payment_status: slip.payment_status || 'Paid',
          salary_days: days,
          basic_pay: basic,
          hra_pay: hra,
          conveyance_pay: conveyance,
          gross_earnings: gross,
          net_salary: net
        };
      }

      return {
        month: monthNum,
        month_name: mName,
        is_issued: false,
        slip_number: '-',
        payment_date: '-',
        payment_status: 'Not Issued',
        salary_days: 0,
        basic_pay: 0,
        hra_pay: 0,
        conveyance_pay: 0,
        gross_earnings: 0,
        net_salary: 0
      };
    });

    const totals = {
      issued_months_count: issuedMonthsCount,
      total_salary_days: totalDays,
      total_basic_pay: totalBasic,
      total_hra_pay: totalHra,
      total_conveyance_pay: totalConveyance,
      total_gross_earnings: totalGross,
      total_net_salary: totalNet,
      average_monthly_net: issuedMonthsCount > 0 ? (totalNet / issuedMonthsCount) : 0,
      total_net_in_words: numberToWords(totalNet)
    };

    res.json({
      success: true,
      data: {
        employee,
        company,
        year: Number(year),
        monthly_breakdown: monthlyBreakdown,
        totals
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayrolls,
  getMyPayrolls,
  getPayrollById,
  getAnnualSalaryStatement,
  previewPayroll,
  generatePayroll,
  bulkGeneratePayroll,
  exportPayrollCsv,
  getPayrollHtml,
  deletePayroll,
  getPayrollSummary
};
