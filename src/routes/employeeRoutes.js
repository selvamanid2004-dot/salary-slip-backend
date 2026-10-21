/**
 * @file employeeRoutes.js
 * @description API Routes for Employee Directory & Profile management.
 */

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { validateEmployee } = require('../middleware/validator');

// GET /api/employees - List all employees with search & filters
router.get('/', employeeController.getEmployees);

// GET /api/employees/stats/summary - Workforce statistics
router.get('/stats/summary', employeeController.getEmployeeStats);

// GET /api/employees/:id - Retrieve single employee
router.get('/:id', employeeController.getEmployeeById);

// POST /api/employees - Create employee
router.post('/', validateEmployee, employeeController.createEmployee);

// PUT /api/employees/:id - Update employee
router.put('/:id', validateEmployee, employeeController.updateEmployee);

// DELETE /api/employees/:id - Remove employee
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
