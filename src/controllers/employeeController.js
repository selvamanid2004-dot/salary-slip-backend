/**
 * @file employeeController.js
 * @description Controller handling Employee Directory management endpoints.
 */

const EmployeeModel = require('../models/Employee');
const logger = require('../utils/logger');

/**
 * GET /api/employees
 * List all employees with search & filtering
 */
const getEmployees = async (req, res, next) => {
  try {
    const { search, department, status } = req.query;
    const employees = await EmployeeModel.getAll({ search, department, status });
    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/:id
 * Get single employee by ID
 */
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await EmployeeModel.getById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employees
 * Create a new employee record
 */
const createEmployee = async (req, res, next) => {
  try {
    const { employee_code, email } = req.body;

    // Check code uniqueness
    const existingCode = await EmployeeModel.getByCode(employee_code);
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Employee code '${employee_code}' already exists`
      });
    }

    const newEmployee = await EmployeeModel.create(req.body);
    logger.info(`[Employee] Created new employee: ${newEmployee.first_name} ${newEmployee.last_name} (${newEmployee.employee_code})`);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/employees/:id
 * Update an existing employee
 */
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await EmployeeModel.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${id} not found`
      });
    }

    const updated = await EmployeeModel.update(id, req.body);
    logger.info(`[Employee] Updated employee ID ${id}: ${updated.first_name} ${updated.last_name}`);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/employees/:id
 * Delete an employee
 */
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await EmployeeModel.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${id} not found`
      });
    }

    await EmployeeModel.delete(id);
    logger.info(`[Employee] Deleted employee ID ${id}: ${existing.first_name} ${existing.last_name}`);

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/stats/summary
 * Summary statistics for executive dashboard
 */
const getEmployeeStats = async (req, res, next) => {
  try {
    const stats = await EmployeeModel.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats
};
