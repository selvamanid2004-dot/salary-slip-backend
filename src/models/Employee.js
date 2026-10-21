/**
 * @file Employee.js
 * @description Data access layer for Employee entity.
 * Handles CRUD operations, searching, filtering, and statistical summaries.
 * Standardized on:
 * - Employee Code
 * - Employee Name
 * - Date of Joining
 * - Role
 * - Basic Salary
 * - HRA
 * - Conveyance Allowance
 */

const { query, inMemoryStore, getDbStatus } = require('../config/database');

function normalizeEmployee(emp) {
  if (!emp) return null;
  const employee_name = emp.employee_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
  const role = emp.role || emp.designation || 'Staff';
  const department = emp.department || 'Engineering';
  const basic_salary = Number(emp.basic_salary) || 0;
  const hra = Number(emp.hra !== undefined ? emp.hra : emp.rent_allowance) || 0;
  const conveyance_allowance = Number(emp.conveyance_allowance !== undefined ? emp.conveyance_allowance : emp.medical_allowance) || 0;
  const total_salary = basic_salary + hra + conveyance_allowance;

  return {
    ...emp,
    employee_name,
    first_name: emp.first_name || employee_name.split(' ')[0] || employee_name,
    last_name: emp.last_name || employee_name.split(' ').slice(1).join(' ') || '',
    role,
    designation: role,
    department,
    basic_salary,
    hra,
    rent_allowance: hra,
    conveyance_allowance,
    medical_allowance: conveyance_allowance,
    total_salary
  };
}

class EmployeeModel {
  /**
   * Retrieves all employees with optional filters
   */
  static async getAll({ search = '', role = '', status = '' } = {}) {
    const isMock = !getDbStatus().isMySQL;

    if (isMock) {
      let results = [...inMemoryStore.employees];
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(e => {
          const name = (e.employee_name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase();
          const code = (e.employee_code || '').toLowerCase();
          const r = (e.role || e.designation || '').toLowerCase();
          const d = (e.department || '').toLowerCase();
          return name.includes(q) || code.includes(q) || r.includes(q) || d.includes(q);
        });
      }
      if (role) {
        results = results.filter(e => (e.role || e.designation) === role);
      }
      return results.map(normalizeEmployee);
    }

    let sql = 'SELECT * FROM `employees` WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR employee_code LIKE ? OR designation LIKE ? OR department LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (role) {
      sql += ' AND designation = ?';
      params.push(role);
    }

    sql += ' ORDER BY id DESC';
    const rows = await query(sql, params);
    return rows.map(normalizeEmployee);
  }

  /**
   * Retrieves single employee by ID
   */
  static async getById(id) {
    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      const found = inMemoryStore.employees.find(e => Number(e.id) === Number(id));
      return normalizeEmployee(found);
    }

    const rows = await query('SELECT * FROM `employees` WHERE id = ?', [id]);
    return rows && rows.length > 0 ? normalizeEmployee(rows[0]) : null;
  }

  /**
   * Retrieves employee by unique employee code
   */
  static async getByCode(code) {
    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      const found = inMemoryStore.employees.find(e => e.employee_code === code);
      return normalizeEmployee(found);
    }

    const rows = await query('SELECT * FROM `employees` WHERE employee_code = ?', [code]);
    return rows && rows.length > 0 ? normalizeEmployee(rows[0]) : null;
  }

  /**
   * Creates a new employee record
   */
  static async create(data) {
    const isMock = !getDbStatus().isMySQL;
    const employee_name = (data.employee_name || `${data.first_name || ''} ${data.last_name || ''}`).trim();
    const role = data.role || data.designation || '';
    const department = (data.department || 'Engineering').trim();
    const basic_salary = Number(data.basic_salary) || 0;
    const hra = Number(data.hra !== undefined ? data.hra : data.rent_allowance) || 0;
    const conveyance_allowance = Number(data.conveyance_allowance !== undefined ? data.conveyance_allowance : data.medical_allowance) || 0;

    const firstName = employee_name.split(' ')[0] || employee_name;
    const lastName = employee_name.split(' ').slice(1).join(' ') || '';

    if (isMock) {
      const nextId = inMemoryStore.employees.length > 0
        ? Math.max(...inMemoryStore.employees.map(e => Number(e.id))) + 1
        : 1;

      const newEmployee = {
        id: nextId,
        employee_code: data.employee_code,
        employee_name,
        first_name: firstName,
        last_name: lastName,
        date_of_joining: data.date_of_joining,
        role,
        designation: role,
        department,
        basic_salary,
        hra,
        rent_allowance: hra,
        conveyance_allowance,
        medical_allowance: conveyance_allowance,
        total_salary: basic_salary + hra + conveyance_allowance,
        created_at: new Date().toISOString()
      };

      inMemoryStore.employees.unshift(newEmployee);
      return normalizeEmployee(newEmployee);
    }

    const sql = `
      INSERT INTO \`employees\` (
        employee_code, first_name, last_name, email, designation, department,
        date_of_joining, basic_salary, hra, conveyance_allowance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const dummyEmail = `${data.employee_code.toLowerCase()}@company.local`;

    const result = await query(sql, [
      data.employee_code,
      firstName,
      lastName,
      dummyEmail,
      role,
      department,
      data.date_of_joining,
      basic_salary,
      hra,
      conveyance_allowance
    ]);

    return await this.getById(result.insertId);
  }

  /**
   * Updates an existing employee
   */
  static async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const isMock = !getDbStatus().isMySQL;
    const employee_name = data.employee_name !== undefined ? data.employee_name.trim() : existing.employee_name;
    const role = data.role !== undefined ? data.role : (data.designation !== undefined ? data.designation : existing.role);
    const department = data.department !== undefined ? data.department.trim() : (existing.department || 'Engineering');
    const basic_salary = data.basic_salary !== undefined ? Number(data.basic_salary) : existing.basic_salary;
    const hra = data.hra !== undefined ? Number(data.hra) : (data.rent_allowance !== undefined ? Number(data.rent_allowance) : existing.hra);
    const conveyance_allowance = data.conveyance_allowance !== undefined ? Number(data.conveyance_allowance) : (data.medical_allowance !== undefined ? Number(data.medical_allowance) : existing.conveyance_allowance);
    const date_of_joining = data.date_of_joining !== undefined ? data.date_of_joining : existing.date_of_joining;

    const firstName = employee_name.split(' ')[0] || employee_name;
    const lastName = employee_name.split(' ').slice(1).join(' ') || '';

    if (isMock) {
      Object.assign(existing, {
        employee_code: data.employee_code !== undefined ? data.employee_code : existing.employee_code,
        employee_name,
        first_name: firstName,
        last_name: lastName,
        date_of_joining,
        role,
        designation: role,
        department,
        basic_salary,
        hra,
        rent_allowance: hra,
        conveyance_allowance,
        medical_allowance: conveyance_allowance,
        total_salary: basic_salary + hra + conveyance_allowance,
        updated_at: new Date().toISOString()
      });
      return normalizeEmployee(existing);
    }

    const sql = `
      UPDATE \`employees\` SET
        employee_code = ?, first_name = ?, last_name = ?, designation = ?, department = ?,
        date_of_joining = ?, basic_salary = ?, hra = ?, conveyance_allowance = ?
      WHERE id = ?
    `;

    await query(sql, [
      data.employee_code !== undefined ? data.employee_code : existing.employee_code,
      firstName,
      lastName,
      role,
      department,
      date_of_joining,
      basic_salary,
      hra,
      conveyance_allowance,
      id
    ]);

    return await this.getById(id);
  }

  /**
   * Deletes an employee
   */
  static async delete(id) {
    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      const idx = inMemoryStore.employees.findIndex(e => Number(e.id) === Number(id));
      if (idx !== -1) {
        inMemoryStore.employees.splice(idx, 1);
        inMemoryStore.payrolls = inMemoryStore.payrolls.filter(p => Number(p.employee_id) !== Number(id));
        return true;
      }
      return false;
    }

    const result = await query('DELETE FROM `employees` WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Retrieves summary statistics
   */
  static async getStats() {
    const employees = await this.getAll();
    const totalCount = employees.length;

    let totalMonthlyBasePayroll = 0;
    const roleMap = {};

    for (const emp of employees) {
      const r = emp.role || 'Staff';
      roleMap[r] = (roleMap[r] || 0) + 1;
      totalMonthlyBasePayroll += (Number(emp.basic_salary) || 0) +
        (Number(emp.rent_allowance) || 0) +
        (Number(emp.medical_allowance) || 0);
    }

    return {
      totalEmployees: totalCount,
      activeEmployees: totalCount,
      departmentDistribution: roleMap,
      totalMonthlyBasePayroll
    };
  }
}

module.exports = EmployeeModel;
