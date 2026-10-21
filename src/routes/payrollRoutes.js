/**
 * @file payrollRoutes.js
 * @description API Routes for Payroll calculation, generation, and salary slips.
 */

const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { validatePayroll } = require('../middleware/validator');

// GET /api/payroll - List salary slips (optional query filters: month, year, employee_id, status)
router.get('/', payrollController.getPayrolls);

// GET /api/payroll/summary/stats - Financial overview of disbursements
router.get('/summary/stats', payrollController.getPayrollSummary);

// GET /api/payroll/export/csv - Export filtered payroll disbursement records to CSV
router.get('/export/csv', payrollController.exportPayrollCsv);

// GET /api/payroll/annual-statement - Get 12-month annual salary statement for an employee
router.get('/annual-statement', payrollController.getAnnualSalaryStatement);

// POST /api/payroll/bulk-generate - Process and persist payslips for all/multiple employees
router.post('/bulk-generate', payrollController.bulkGeneratePayroll);

// GET /api/payroll/:id/html - Render printable HTML view of the salary slip
router.get('/:id/html', payrollController.getPayrollHtml);

// GET /api/payroll/:id - Get salary slip record details
router.get('/:id', payrollController.getPayrollById);

// POST /api/payroll/preview - Preview salary calculation before committing
router.post('/preview', validatePayroll, payrollController.previewPayroll);

// POST /api/payroll/generate - Process and persist monthly salary slip
router.post('/generate', validatePayroll, payrollController.generatePayroll);

// DELETE /api/payroll/:id - Remove salary slip
router.delete('/:id', payrollController.deletePayroll);

module.exports = router;
