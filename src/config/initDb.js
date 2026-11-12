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
  logo_url: '',
  bank_name: 'HDFC Bank Ltd.',
  bank_account_no: '50200084920194',
  bank_ifsc_code: 'HDFC0001234',
  bank_branch: 'Cyber City DLF Phase 2, Gurugram',
  bank_account_holder: 'Apex Global Technologies Ltd.',
  bank_upi_id: 'apexglobal@okhdfcbank'
};

const seedInvoices = [
  {
    id: 1,
    doc_type: 'invoice',
    doc_number: 'INV-2026-0001',
    bill_type: 'gst',
    issue_date: '2026-10-15',
    due_date: '2026-10-30',
    status: 'paid',
    client_name: 'Rajesh Mehta',
    client_company: 'Nexus FinTech Solutions Pvt Ltd',
    client_email: 'accounts@nexusfintech.io',
    client_phone: '+91 98765 43210',
    client_address: 'Plot 12, Whitefield EPIP Industrial Zone',
    client_city: 'Bengaluru',
    client_state: 'Karnataka',
    client_pincode: '560066',
    client_gstin: '29AABCN8291M1Z8',
    company_name: 'Apex Global Technologies Ltd.',
    company_address: 'Tower 4, Cyber City Phase 2, DLF Cyber Park, Sector 25, Gurugram, Haryana, 122002',
    company_phone: '+91 124 458 9200',
    company_email: 'payroll@apexglobal.tech',
    company_gstin: '07AAAAA0000A1Z5',
    company_pan: 'AAACA1234F',
    company_logo: '',
    bank_name: 'HDFC Bank Ltd.',
    bank_account_no: '50200084920194',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Cyber City DLF Phase 2, Gurugram',
    bank_account_holder: 'Apex Global Technologies Ltd.',
    bank_upi_id: 'apexglobal@okhdfcbank',
    items: [
      {
        id: 1,
        service_title: 'Website Development',
        description: 'Custom React & Node.js Customer Portal with Payment Gateway and Analytics Dashboard',
        sac_code: '998314',
        qty: 1,
        unit: 'Project',
        rate: 120000.00,
        amount: 120000.00
      },
      {
        id: 2,
        service_title: 'UI/UX Design & Prototyping',
        description: 'Figma interactive prototypes, design system, responsive mobile & desktop wireframes',
        sac_code: '998314',
        qty: 1,
        unit: 'Project',
        rate: 45000.00,
        amount: 45000.00
      }
    ],
    subtotal: 165000.00,
    discount_rate: 0.00,
    discount_amount: 0.00,
    tax_type: 'igst',
    gst_rate: 18.00,
    cgst_amount: 0.00,
    sgst_amount: 0.00,
    igst_amount: 29700.00,
    total_tax: 29700.00,
    grand_total: 194700.00,
    grand_total_in_words: 'One Lakh Ninety-Four Thousand Seven Hundred Rupees Only',
    currency_symbol: '₹',
    notes: 'Thank you for partnering with Apex Global Technologies. Invoice is marked as paid.',
    terms: '1. All payments are non-refundable after milestone acceptance.\n2. Standard SLA support applies for 90 days.',
    converted_from_id: null,
    created_at: '2026-10-15T10:00:00.000Z'
  },
  {
    id: 2,
    doc_type: 'quotation',
    doc_number: 'QT-2026-0001',
    bill_type: 'non_gst',
    issue_date: '2026-11-01',
    due_date: '2026-11-30',
    status: 'sent',
    client_name: 'Anita Sharma',
    client_company: 'Zenith Healthtech Startup',
    client_email: 'anita@zenithhealth.app',
    client_phone: '+91 98123 45678',
    client_address: '7th Floor, Innovation Hub, Outer Ring Road',
    client_city: 'Hyderabad',
    client_state: 'Telangana',
    client_pincode: '500081',
    client_gstin: '',
    company_name: 'Apex Global Technologies Ltd.',
    company_address: 'Tower 4, Cyber City Phase 2, DLF Cyber Park, Sector 25, Gurugram, Haryana, 122002',
    company_phone: '+91 124 458 9200',
    company_email: 'payroll@apexglobal.tech',
    company_gstin: '',
    company_pan: 'AAACA1234F',
    company_logo: '',
    bank_name: 'HDFC Bank Ltd.',
    bank_account_no: '50200084920194',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Cyber City DLF Phase 2, Gurugram',
    bank_account_holder: 'Apex Global Technologies Ltd.',
    bank_upi_id: 'apexglobal@okhdfcbank',
    items: [
      {
        id: 1,
        service_title: 'Mobile App Development',
        description: 'Cross-platform React Native iOS & Android Patient Booking & Teleconsultation App',
        sac_code: '',
        qty: 1,
        unit: 'Project',
        rate: 180000.00,
        amount: 180000.00
      },
      {
        id: 2,
        service_title: 'Search Engine Optimization (SEO)',
        description: 'Comprehensive technical SEO audit, Core Web Vitals optimization, and keyword targeting',
        sac_code: '',
        qty: 1,
        unit: 'Package',
        rate: 35000.00,
        amount: 35000.00
      }
    ],
    subtotal: 215000.00,
    discount_rate: 0.00,
    discount_amount: 15000.00,
    tax_type: 'none',
    gst_rate: 0.00,
    cgst_amount: 0.00,
    sgst_amount: 0.00,
    igst_amount: 0.00,
    total_tax: 0.00,
    grand_total: 200000.00,
    grand_total_in_words: 'Two Lakh Rupees Only',
    currency_symbol: '₹',
    notes: 'Quotation valid for 30 calendar days from the date of issue. Special inaugural discount applied.',
    terms: '1. 40% advance upon contract signing, 40% upon beta release, 20% on final store deployment.\n2. Includes 3 revision cycles for design and QA.',
    converted_from_id: null,
    created_at: '2026-11-01T11:30:00.000Z'
  },
  {
    id: 3,
    doc_type: 'invoice',
    doc_number: 'INV-2026-0002',
    bill_type: 'non_gst',
    issue_date: '2026-11-05',
    due_date: '2026-11-20',
    status: 'unpaid',
    client_name: 'Dr. Sandeep Patel',
    client_company: 'CarePlus Diagnostic Clinic',
    client_email: 'billing@careplusclinic.com',
    client_phone: '+91 99887 76655',
    client_address: 'Shop 14, Commercial Complex, Sector 15',
    client_city: 'Gurugram',
    client_state: 'Haryana',
    client_pincode: '122001',
    client_gstin: '',
    company_name: 'Apex Global Technologies Ltd.',
    company_address: 'Tower 4, Cyber City Phase 2, DLF Cyber Park, Sector 25, Gurugram, Haryana, 122002',
    company_phone: '+91 124 458 9200',
    company_email: 'payroll@apexglobal.tech',
    company_gstin: '',
    company_pan: 'AAACA1234F',
    company_logo: '',
    bank_name: 'HDFC Bank Ltd.',
    bank_account_no: '50200084920194',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Cyber City DLF Phase 2, Gurugram',
    bank_account_holder: 'Apex Global Technologies Ltd.',
    bank_upi_id: 'apexglobal@okhdfcbank',
    items: [
      {
        id: 1,
        service_title: 'Custom Software Development',
        description: 'Cloud Clinic Appointment Scheduling and Patient Electronic Medical Records (EMR) system',
        sac_code: '',
        qty: 1,
        unit: 'Project',
        rate: 60000.00,
        amount: 60000.00
      }
    ],
    subtotal: 60000.00,
    discount_rate: 0.00,
    discount_amount: 0.00,
    tax_type: 'none',
    gst_rate: 0.00,
    cgst_amount: 0.00,
    sgst_amount: 0.00,
    igst_amount: 0.00,
    total_tax: 0.00,
    grand_total: 60000.00,
    grand_total_in_words: 'Sixty Thousand Rupees Only',
    currency_symbol: '₹',
    notes: 'Non-GST Service Bill. Net payable within 15 days.',
    terms: '1. Please transfer directly to the provided bank account or UPI ID.\n2. Quote invoice number in remarks.',
    converted_from_id: null,
    created_at: '2026-11-05T09:00:00.000Z'
  }
];

const seedEmployees = [
  {
    id: 1,
    employee_code: 'EMP-1001',
    employee_name: 'Aarav Sharma',
    first_name: 'Aarav',
    last_name: 'Sharma',
    email: 'aarav.sharma@apexglobal.tech',
    phone: '+91 98765 01001',
    department: 'Engineering',
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
    email: 'priya.nair@apexglobal.tech',
    phone: '+91 98765 01002',
    department: 'Product Design',
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
    email: 'rohan.verma@apexglobal.tech',
    phone: '+91 98765 01003',
    department: 'Human Resources',
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
    email: 'ananya.deshmukh@apexglobal.tech',
    phone: '+91 98765 01004',
    department: 'Finance',
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
    email: 'karthik.subramanian@apexglobal.tech',
    phone: '+91 98765 01005',
    department: 'Sales & Business',
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
  inMemoryStore.invoices = JSON.parse(JSON.stringify(seedInvoices));

  if (!isConnected) {
    logger.info('[Init] Seeded in-memory store with default Company, Employees, Payroll, Invoices/Quotes, and Admin user.');
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
            emp.id, emp.employee_code, emp.first_name, emp.last_name, emp.email, emp.phone || '',
            emp.date_of_birth || null, emp.gender || 'Male', emp.designation, emp.department, emp.date_of_joining,
            emp.employment_type || 'Full-Time', emp.status || 'Active', emp.pan_number || '', emp.pf_uan || '', emp.bank_name || '',
            emp.bank_account_no || '', emp.bank_ifsc_code || '', emp.basic_salary || 0, emp.hra || 0, emp.conveyance_allowance || 0,
            emp.medical_allowance || 0, emp.special_allowance || 0, emp.pf_employee || 0, emp.pf_employer || 0, emp.professional_tax || 0
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

    // Ensure bank columns exist on company_profile
    try {
      const cols = await query('SHOW COLUMNS FROM `company_profile` LIKE "bank_name"');
      if (!cols || cols.length === 0) {
        await query(`ALTER TABLE \`company_profile\`
          ADD COLUMN \`bank_name\` VARCHAR(100) DEFAULT '',
          ADD COLUMN \`bank_account_no\` VARCHAR(50) DEFAULT '',
          ADD COLUMN \`bank_ifsc_code\` VARCHAR(50) DEFAULT '',
          ADD COLUMN \`bank_branch\` VARCHAR(100) DEFAULT '',
          ADD COLUMN \`bank_account_holder\` VARCHAR(150) DEFAULT '',
          ADD COLUMN \`bank_upi_id\` VARCHAR(100) DEFAULT ''
        `);
        logger.info('[MySQL] Added bank account columns to company_profile table.');
        
        // Update company profile with default seed bank details
        await query(`UPDATE \`company_profile\` SET
          bank_name = ?, bank_account_no = ?, bank_ifsc_code = ?, bank_branch = ?,
          bank_account_holder = ?, bank_upi_id = ?
          WHERE id = 1`,
          [seedCompany.bank_name, seedCompany.bank_account_no, seedCompany.bank_ifsc_code,
           seedCompany.bank_branch, seedCompany.bank_account_holder, seedCompany.bank_upi_id]
        );
      }
    } catch (colErr) {
      logger.warn(`[MySQL] Note on company_profile columns check: ${colErr.message}`);
    }

    // Check if invoices table has records
    const invoices = await query('SELECT id FROM \`invoices\` LIMIT 1');
    if (!invoices || invoices.length === 0) {
      for (const inv of seedInvoices) {
        await query(
          `INSERT INTO \`invoices\` (
            id, doc_type, doc_number, bill_type, issue_date, due_date, status,
            client_name, client_company, client_email, client_phone, client_address, client_city, client_state, client_pincode, client_gstin,
            company_name, company_address, company_phone, company_email, company_gstin, company_pan, company_logo,
            bank_name, bank_account_no, bank_ifsc, bank_branch, bank_account_holder, bank_upi_id,
            items, subtotal, discount_rate, discount_amount, tax_type, gst_rate,
            cgst_amount, sgst_amount, igst_amount, total_tax, grand_total, grand_total_in_words,
            currency_symbol, notes, terms, converted_from_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inv.id, inv.doc_type, inv.doc_number, inv.bill_type, inv.issue_date, inv.due_date, inv.status,
            inv.client_name, inv.client_company, inv.client_email, inv.client_phone, inv.client_address, inv.client_city, inv.client_state, inv.client_pincode, inv.client_gstin,
            inv.company_name, inv.company_address, inv.company_phone, inv.company_email, inv.company_gstin, inv.company_pan, inv.company_logo,
            inv.bank_name, inv.bank_account_no, inv.bank_ifsc, inv.bank_branch, inv.bank_account_holder, inv.bank_upi_id,
            JSON.stringify(inv.items), inv.subtotal, inv.discount_rate, inv.discount_amount, inv.tax_type, inv.gst_rate,
            inv.cgst_amount, inv.sgst_amount, inv.igst_amount, inv.total_tax, inv.grand_total, inv.grand_total_in_words,
            inv.currency_symbol, inv.notes, inv.terms, inv.converted_from_id
          ]
        );
      }
      logger.info(`[MySQL] Seeded ${seedInvoices.length} sample IT Invoices and Quotations.`);
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
  seedAdmin,
  seedInvoices
};
