/**
 * @file initDb.js
 * @description Database initialization & seed script.
 * Executes DDL schema definitions in MySQL and seeds rich initial employee & payroll records.
 * Ensures consistent test data whether running against MySQL or the resilient in-memory store.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDatabasePool, query, inMemoryStore, getDbStatus } = require('./database');
const logger = require('../utils/logger');

const seedAdmin = {
  id: 1,
  username: 'admin',
  password_hash: bcrypt.hashSync('admin123', 10),
  name: 'Administrator'
};

const seedCompany = {
  id: 1,
  company_name: 'Apex Global Technologies Ltd.',
  tagline: 'Enterprise Software & Cloud Innovations',
  address_line1: 'Tower 4, Cyber City Phase 2',
  address_line2: 'DLF Cyber Park, Sector 25',
  city: 'Gurugram',
  state: 'Haryana',
  postal_code: '122002',
  country: 'India',
  email: 'payroll@apexglobal.tech',
  phone: '+91 124 458 9200',
  website: 'https://apexglobal.tech',
  pan_number: 'AAACA1234F',
  gst_number: '07AAAAA0000A1Z5',
  currency_symbol: '₹',
  currency_code: 'INR',
  authorized_signatory_name: 'Vikram Malhotra',
  authorized_signatory_title: 'Head of People & Payroll',
  logo_url: ''
};

const seedEmployees = [
  {
    id: 1,
    employee_code: 'EMP-1001',
    employee_name: 'Aarav Sharma',
    first_name: 'Aarav',
    last_name: 'Sharma',
    date_of_joining: '2021-03-01',
    role: 'Lead Software Architect',
    designation: 'Lead Software Architect',
    basic_salary: 85000.00,
    hra: 34000.00,
    conveyance_allowance: 5000.00
  },
  {
    id: 2,
    employee_code: 'EMP-1002',
    employee_name: 'Priya Nair',
    first_name: 'Priya',
    last_name: 'Nair',
    date_of_joining: '2022-06-15',
    role: 'Senior Product Designer',
    designation: 'Senior Product Designer',
    basic_salary: 65000.00,
    hra: 26000.00,
    conveyance_allowance: 4000.00
  },
  {
    id: 3,
    employee_code: 'EMP-1003',
    employee_name: 'Rohan Verma',
    first_name: 'Rohan',
    last_name: 'Verma',
    date_of_joining: '2020-01-10',
    role: 'Talent Acquisition Manager',
    designation: 'Talent Acquisition Manager',
    basic_salary: 75000.00,
    hra: 30000.00,
    conveyance_allowance: 4500.00
  },
  {
    id: 4,
    employee_code: 'EMP-1004',
    employee_name: 'Ananya Deshmukh',
    first_name: 'Ananya',
    last_name: 'Deshmukh',
    date_of_joining: '2023-04-01',
    role: 'Financial Analyst',
    designation: 'Financial Analyst',
    basic_salary: 50000.00,
    hra: 20000.00,
    conveyance_allowance: 3000.00
  },
  {
    id: 5,
    employee_code: 'EMP-1005',
    employee_name: 'Karthik Subramanian',
    first_name: 'Karthik',
    last_name: 'Subramanian',
    date_of_joining: '2022-10-01',
    role: 'Enterprise Sales Manager',
    designation: 'Enterprise Sales Manager',
    basic_salary: 70000.00,
    hra: 28000.00,
    conveyance_allowance: 4000.00
  }
];

const seedPayrolls = [
  {
    id: 1,
    slip_number: 'SLIP-202609-001',
    employee_id: 1,
    month: 9,
    year: 2026,
    payment_date: '2026-09-30',
    salary_days: 30,
    total_working_days: 30,
    days_worked: 30.0,
    paid_leaves: 0.0,
    unpaid_leaves: 0.0,
    basic_pay: 85000.00,
    hra_pay: 34000.00,
    conveyance_pay: 5000.00,
    rent_pay: 34000.00,
    medical_pay: 0.00,
    special_allowance_pay: 0.00,
    bonus: 0.00,
    overtime_pay: 0.00,
    gross_earnings: 124000.00,
    pf_deduction: 0.00,
    professional_tax_deduction: 0.00,
    tds_tax_deduction: 0.00,
    esi_deduction: 0.00,
    other_deductions: 0.00,
    total_deductions: 0.00,
    net_salary: 124000.00,
    net_salary_in_words: 'One Lakh Twenty-Four Thousand Rupees Only',
    payment_status: 'Paid',
    payment_method: 'Bank Transfer',
    is_locked: 1,
    remarks: 'September 2026 Regular Payroll'
  },
  {
    id: 2,
    slip_number: 'SLIP-202609-002',
    employee_id: 2,
    month: 9,
    year: 2026,
    payment_date: '2026-09-30',
    salary_days: 30,
    total_working_days: 30,
    days_worked: 30.0,
    paid_leaves: 0.0,
    unpaid_leaves: 0.0,
    basic_pay: 65000.00,
    hra_pay: 26000.00,
    conveyance_pay: 4000.00,
    rent_pay: 26000.00,
    medical_pay: 0.00,
    special_allowance_pay: 0.00,
    bonus: 0.00,
    overtime_pay: 0.00,
    gross_earnings: 95000.00,
    pf_deduction: 0.00,
    professional_tax_deduction: 0.00,
    tds_tax_deduction: 0.00,
    esi_deduction: 0.00,
    other_deductions: 0.00,
    total_deductions: 0.00,
    net_salary: 95000.00,
    net_salary_in_words: 'Ninety-Five Thousand Rupees Only',
    payment_status: 'Paid',
    payment_method: 'Bank Transfer',
    is_locked: 1,
    remarks: 'September 2026 Regular Payroll'
  }
];

async function initializeDatabase() {
  const isConnected = await initDatabasePool();

  // Populate In-Memory Store for immediate availability
  inMemoryStore.company_profile = [seedCompany];
  inMemoryStore.employees = JSON.parse(JSON.stringify(seedEmployees));
  inMemoryStore.payrolls = JSON.parse(JSON.stringify(seedPayrolls));
  inMemoryStore.admin_auth = [JSON.parse(JSON.stringify(seedAdmin))];

  if (!isConnected) {
    logger.info('[Init] Seeded in-memory store with default Company, 5 Employees, sample Payroll, and Admin user.');
    return;
  }

  // If MySQL is connected, execute DDL schema file
  try {
    const schemaSqlPath = path.join(__dirname, 'schema.sql');
    const sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');

    // Split SQL queries on semicolons outside of quotes
    const statements = sqlContent
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await query(statement);
    }
    logger.info('[MySQL] Schema verification and tables creation completed.');

    // Check if company_profile has records
    const companies = await query('SELECT id FROM `company_profile` LIMIT 1');
    if (!companies || companies.length === 0) {
      await query(
        `INSERT INTO \`company_profile\` (
          id, company_name, tagline, address_line1, address_line2, city, state, postal_code,
          country, email, phone, website, pan_number, gst_number, currency_symbol, currency_code,
          authorized_signatory_name, authorized_signatory_title
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          seedCompany.id, seedCompany.company_name, seedCompany.tagline, seedCompany.address_line1,
          seedCompany.address_line2, seedCompany.city, seedCompany.state, seedCompany.postal_code,
          seedCompany.country, seedCompany.email, seedCompany.phone, seedCompany.website,
          seedCompany.pan_number, seedCompany.gst_number, seedCompany.currency_symbol, seedCompany.currency_code,
          seedCompany.authorized_signatory_name, seedCompany.authorized_signatory_title
        ]
      );
      logger.info('[MySQL] Seeded default Company Profile.');
    }

    // Check if employees table has records
    const employees = await query('SELECT id FROM `employees` LIMIT 1');
    if (!employees || employees.length === 0) {
      for (const emp of seedEmployees) {
        await query(
          `INSERT INTO \`employees\` (
            id, employee_code, first_name, last_name, email, phone, date_of_birth, gender,
            designation, department, date_of_joining, employment_type, status, pan_number,
            pf_uan, bank_name, bank_account_no, bank_ifsc_code, basic_salary, hra,
            conveyance_allowance, medical_allowance, special_allowance, pf_employee, pf_employer, professional_tax
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.id, emp.employee_code, emp.first_name, emp.last_name, emp.email, emp.phone,
            emp.date_of_birth, emp.gender, emp.designation, emp.department, emp.date_of_joining,
            emp.employment_type, emp.status, emp.pan_number, emp.pf_uan, emp.bank_name,
            emp.bank_account_no, emp.bank_ifsc_code, emp.basic_salary, emp.hra, emp.conveyance_allowance,
            emp.medical_allowance, emp.special_allowance, emp.pf_employee, emp.pf_employer, emp.professional_tax
          ]
        );
      }
      logger.info(`[MySQL] Seeded ${seedEmployees.length} initial Employee records.`);
    }

    // Check if payrolls table has records
    const payrolls = await query('SELECT id FROM `payrolls` LIMIT 1');
    if (!payrolls || payrolls.length === 0) {
      const p = seedPayrolls[0];
      await query(
        `INSERT INTO \`payrolls\` (
          id, slip_number, employee_id, month, year, payment_date, total_working_days, days_worked,
          paid_leaves, unpaid_leaves, basic_pay, hra_pay, conveyance_pay, medical_pay,
          special_allowance_pay, bonus, overtime_pay, gross_earnings, pf_deduction,
          professional_tax_deduction, tds_tax_deduction, esi_deduction, other_deductions,
          total_deductions, net_salary, net_salary_in_words, payment_status, payment_method, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, p.slip_number, p.employee_id, p.month, p.year, p.payment_date, p.total_working_days,
          p.days_worked, p.paid_leaves, p.unpaid_leaves, p.basic_pay, p.hra_pay, p.conveyance_pay,
          p.medical_pay, p.special_allowance_pay, p.bonus, p.overtime_pay, p.gross_earnings,
          p.pf_deduction, p.professional_tax_deduction, p.tds_tax_deduction, p.esi_deduction,
          p.other_deductions, p.total_deductions, p.net_salary, p.net_salary_in_words,
          p.payment_status, p.payment_method, p.remarks
        ]
      );
      logger.info('[MySQL] Seeded sample Payroll slip.');
    }

    // Check if admin_auth table has records
    const admins = await query('SELECT id FROM `admin_auth` LIMIT 1');
    if (!admins || admins.length === 0) {
      await query(
        `INSERT INTO \`admin_auth\` (id, username, password_hash, name) VALUES (?, ?, ?, ?)`,
        [seedAdmin.id, seedAdmin.username, seedAdmin.password_hash, seedAdmin.name]
      );
      logger.info('[MySQL] Seeded default Admin user (admin / admin123).');
    }

  } catch (err) {
    logger.error(`[MySQL] Initialization error: ${err.message}`, { stack: err.stack });
  }
}

if (require.main === module) {
  initializeDatabase().then(() => {
    logger.info('[Init] Database initialization process finished.');
    process.exit(0);
  });
}

module.exports = {
  initializeDatabase,
  seedCompany,
  seedEmployees,
  seedPayrolls,
  seedAdmin
};
