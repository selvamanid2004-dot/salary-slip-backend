/**
 * @file Payroll.js
 * @description Data access layer for Payroll and Salary Slip entities.
 */

const { query, inMemoryStore, getDbStatus } = require('../config/database');

class PayrollModel {
  /**
   * Retrieves all payroll records with optional filtering
   */
  static async getAll({ month, year, employee_id, status } = {}) {
    const isMock = !getDbStatus().isMySQL;

    if (isMock) {
      let results = [...inMemoryStore.payrolls];
      if (month) {
        results = results.filter(p => Number(p.month) === Number(month));
      }
      if (year) {
        results = results.filter(p => Number(p.year) === Number(year));
      }
      if (employee_id) {
        results = results.filter(p => Number(p.employee_id) === Number(employee_id));
      }
      if (status) {
        results = results.filter(p => p.payment_status === status);
      }

      // Enrich with employee details
      return results.map(p => {
        const emp = inMemoryStore.employees.find(e => Number(e.id) === Number(p.employee_id));
        return {
          ...p,
          salary_days: p.salary_days !== undefined ? p.salary_days : p.days_worked,
          employee_code: emp ? emp.employee_code : '',
          employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
          department: emp ? emp.department : '',
          designation: emp ? emp.designation : ''
        };
      });
    }

    let sql = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name, 
             CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             e.department, e.designation, e.bank_name, e.bank_account_no, e.pan_number, e.pf_uan
      FROM \`payrolls\` p
      JOIN \`employees\` e ON p.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      sql += ' AND p.month = ?';
      params.push(Number(month));
    }
    if (year) {
      sql += ' AND p.year = ?';
      params.push(Number(year));
    }
    if (employee_id) {
      sql += ' AND p.employee_id = ?';
      params.push(Number(employee_id));
    }
    if (status) {
      sql += ' AND p.payment_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY p.year DESC, p.month DESC, p.id DESC';
    const rows = await query(sql, params);
    return (rows || []).map(r => ({
      ...r,
      salary_days: r.salary_days !== undefined ? r.salary_days : r.days_worked
    }));
  }

  /**
   * Retrieves single payroll slip by ID
   */
  static async getById(id) {
    const isMock = !getDbStatus().isMySQL;

    if (isMock) {
      const p = inMemoryStore.payrolls.find(item => Number(item.id) === Number(id));
      if (!p) return null;
      const emp = inMemoryStore.employees.find(e => Number(e.id) === Number(p.employee_id));
      return {
        ...p,
        employee_code: emp ? emp.employee_code : '',
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        department: emp ? emp.department : '',
        designation: emp ? emp.designation : '',
        employee: emp || null
      };
    }

    const sql = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name,
             CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             e.department, e.designation, e.bank_name, e.bank_account_no,
             e.bank_ifsc_code, e.pan_number, e.pf_uan, e.date_of_joining
      FROM \`payrolls\` p
      JOIN \`employees\` e ON p.employee_id = e.id
      WHERE p.id = ?
    `;
    const rows = await query(sql, [id]);
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        ...row,
        salary_days: row.salary_days !== undefined ? row.salary_days : row.days_worked
      };
    }
    return null;
  }

  /**
   * Retrieves single payroll slip by Slip Number
   */
  static async getBySlipNumber(slipNumber) {
    const isMock = !getDbStatus().isMySQL;

    if (isMock) {
      const p = inMemoryStore.payrolls.find(item => item.slip_number === slipNumber);
      if (!p) return null;
      const emp = inMemoryStore.employees.find(e => Number(e.id) === Number(p.employee_id));
      return {
        ...p,
        salary_days: p.salary_days !== undefined ? p.salary_days : p.days_worked,
        employee_code: emp ? emp.employee_code : '',
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        department: emp ? emp.department : '',
        designation: emp ? emp.designation : '',
        employee: emp || null
      };
    }

    const sql = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name,
             CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             e.department, e.designation, e.bank_name, e.bank_account_no,
             e.bank_ifsc_code, e.pan_number, e.pf_uan, e.date_of_joining
      FROM \`payrolls\` p
      JOIN \`employees\` e ON p.employee_id = e.id
      WHERE p.slip_number = ?
    `;
    const rows = await query(sql, [slipNumber]);
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        ...row,
        salary_days: row.salary_days !== undefined ? row.salary_days : row.days_worked
      };
    }
    return null;
  }

  /**
   * Retrieves single payroll slip by Employee ID, Month, and Year
   */
  static async getByEmployeeAndMonth(employeeId, month, year) {
    const isMock = !getDbStatus().isMySQL;

    if (isMock) {
      const found = inMemoryStore.payrolls.find(
        p => Number(p.employee_id) === Number(employeeId) &&
             Number(p.month) === Number(month) &&
             Number(p.year) === Number(year)
      );
      if (!found) return null;
      return await this.getById(found.id);
    }

    const sql = `
      SELECT p.*, e.employee_code, e.first_name, e.last_name,
             CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             e.department, e.designation, e.bank_name, e.bank_account_no,
             e.bank_ifsc_code, e.pan_number, e.pf_uan, e.date_of_joining
      FROM \`payrolls\` p
      JOIN \`employees\` e ON p.employee_id = e.id
      WHERE p.employee_id = ? AND p.month = ? AND p.year = ?
    `;
    const rows = await query(sql, [Number(employeeId), Number(month), Number(year)]);
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        ...row,
        salary_days: row.salary_days !== undefined ? row.salary_days : row.days_worked
      };
    }
    return null;
  }

  /**
   * Creates and saves an issued payroll entry in the database.
   * Ensures the salary slip is successfully saved and locked upon issuance.
   */
  static async create(data) {
    const isMock = !getDbStatus().isMySQL;

    if (isMock) {
      // Find existing slip for this employee, month, and year if previously issued
      const existingIdx = inMemoryStore.payrolls.findIndex(
        p => Number(p.employee_id) === Number(data.employee_id) &&
             Number(p.month) === Number(data.month) &&
             Number(p.year) === Number(data.year)
      );

      const nextId = inMemoryStore.payrolls.length > 0
        ? Math.max(...inMemoryStore.payrolls.map(p => Number(p.id))) + 1
        : 1;

      const record = {
        ...data,
        id: existingIdx !== -1 ? inMemoryStore.payrolls[existingIdx].id : nextId,
        is_locked: 1,
        payment_status: 'Paid',
        created_at: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        inMemoryStore.payrolls[existingIdx] = record;
      } else {
        inMemoryStore.payrolls.unshift(record);
      }

      return await this.getById(record.id);
    }

    const sql = `
      INSERT INTO \`payrolls\` (
        slip_number, employee_id, month, year, payment_date, total_working_days,
        days_worked, paid_leaves, unpaid_leaves, basic_pay, hra_pay, conveyance_pay,
        medical_pay, special_allowance_pay, bonus, overtime_pay, gross_earnings,
        pf_deduction, professional_tax_deduction, tds_tax_deduction, esi_deduction,
        other_deductions, total_deductions, net_salary, net_salary_in_words,
        payment_status, payment_method, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        slip_number = VALUES(slip_number),
        payment_date = VALUES(payment_date),
        total_working_days = VALUES(total_working_days),
        days_worked = VALUES(days_worked),
        paid_leaves = VALUES(paid_leaves),
        unpaid_leaves = VALUES(unpaid_leaves),
        basic_pay = VALUES(basic_pay),
        hra_pay = VALUES(hra_pay),
        conveyance_pay = VALUES(conveyance_pay),
        medical_pay = VALUES(medical_pay),
        special_allowance_pay = VALUES(special_allowance_pay),
        bonus = VALUES(bonus),
        overtime_pay = VALUES(overtime_pay),
        gross_earnings = VALUES(gross_earnings),
        pf_deduction = VALUES(pf_deduction),
        professional_tax_deduction = VALUES(professional_tax_deduction),
        tds_tax_deduction = VALUES(tds_tax_deduction),
        esi_deduction = VALUES(esi_deduction),
        other_deductions = VALUES(other_deductions),
        total_deductions = VALUES(total_deductions),
        net_salary = VALUES(net_salary),
        net_salary_in_words = VALUES(net_salary_in_words),
        payment_status = VALUES(payment_status),
        payment_method = VALUES(payment_method),
        remarks = VALUES(remarks)
    `;

    const result = await query(sql, [
      data.slip_number, data.employee_id, data.month, data.year, data.payment_date,
      data.total_working_days, data.days_worked, data.paid_leaves, data.unpaid_leaves,
      data.basic_pay, data.hra_pay, data.conveyance_pay, data.medical_pay,
      data.special_allowance_pay, data.bonus, data.overtime_pay, data.gross_earnings,
      data.pf_deduction, data.professional_tax_deduction, data.tds_tax_deduction,
      data.esi_deduction, data.other_deductions, data.total_deductions,
      data.net_salary, data.net_salary_in_words, data.payment_status || 'Paid',
      data.payment_method || 'Bank Transfer', data.remarks
    ]);

    const recordId = result.insertId || (await this.getByEmployeeAndMonth(data.employee_id, data.month, data.year))?.id;
    return await this.getById(recordId);
  }

  /**
   * Deletes a payroll record
   */
  static async delete(id) {
    const isMock = !getDbStatus().isMySQL;
    if (isMock) {
      const idx = inMemoryStore.payrolls.findIndex(p => Number(p.id) === Number(id));
      if (idx !== -1) {
        inMemoryStore.payrolls.splice(idx, 1);
        return true;
      }
      return false;
    }

    const result = await query('DELETE FROM \`payrolls\` WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Summarizes monthly payroll
   */
  static async getSummary({ month, year } = {}) {
    const payrolls = await this.getAll({ month, year });
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const p of payrolls) {
      totalGross += Number(p.gross_earnings) || 0;
      totalDeductions += Number(p.total_deductions) || 0;
      totalNet += Number(p.net_salary) || 0;
    }

    return {
      count: payrolls.length,
      totalGross,
      totalDeductions,
      totalNet,
      month: month || 'All',
      year: year || 'All'
    };
  }
}

module.exports = PayrollModel;
