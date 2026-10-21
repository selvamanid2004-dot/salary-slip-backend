/**
 * @file validator.js
 * @description Request validation middleware.
 * Ensures incoming payload bodies contain mandatory fields and correct data types
 * before reaching the controllers.
 */

/**
 * Validates Employee payload
 */
const validateEmployee = (req, res, next) => {
  const {
    employee_code,
    employee_name,
    first_name,
    date_of_joining,
    role,
    designation,
    basic_salary
  } = req.body;

  const errors = [];
  const name = (employee_name || first_name || '').trim();
  const empRole = (role || designation || '').trim();

  if (!employee_code || !employee_code.trim()) errors.push('Employee Code is required');
  if (!name) errors.push('Employee Name is required');
  if (!date_of_joining) errors.push('Date of Joining is required');
  if (!empRole) errors.push('Role is required');
  if (basic_salary === undefined || basic_salary === null || isNaN(Number(basic_salary)) || Number(basic_salary) < 0) {
    errors.push('Basic Salary must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validates Payroll generation payload
 */
const validatePayroll = (req, res, next) => {
  const { employee_id, month } = req.body;
  const errors = [];

  const rawDays = req.body.salary_days !== undefined
    ? req.body.salary_days
    : req.body.working_days !== undefined
    ? req.body.working_days
    : req.body.days_worked;

  if (!employee_id) errors.push('Employee is required');
  if (!month || month < 1 || month > 12) errors.push('Month must be between 1 and 12');
  if (rawDays === undefined || rawDays === null || isNaN(Number(rawDays)) || Number(rawDays) < 0) {
    errors.push('Salary Days must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Payroll validation failed',
      errors
    });
  }

  // Normalize defaults
  const salaryDays = Number(rawDays);
  const totalDays = Number(req.body.total_days) || Math.max(30, salaryDays || 30);
  req.body.year = Number(req.body.year) || new Date().getFullYear();
  req.body.total_days = totalDays;
  req.body.salary_days = salaryDays;
  req.body.days_worked = Math.min(totalDays, salaryDays);
  req.body.working_days = salaryDays;
  if (!req.body.payment_method) req.body.payment_method = 'Bank Transfer';
  if (!req.body.payment_date) req.body.payment_date = new Date().toISOString().slice(0, 10);

  next();
};

module.exports = {
  validateEmployee,
  validatePayroll
};
