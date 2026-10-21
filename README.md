# Salary Slip & Employee Management Backend

A modular, production-ready REST API built with Node.js, Express, MySQL, and Winston logging.

---

## Architecture & Directory Structure

```text
backend/
├── logs/                         # File logs managed by Winston
│   ├── error.log                 # Critical/Error logs
│   └── combined.log              # Full HTTP requests & general application logs
├── src/
│   ├── config/
│   │   ├── database.js           # MySQL connection pool & resilient query interface
│   │   ├── initDb.js             # DDL execution and initial data seeding
│   │   └── schema.sql            # Clean MySQL schema definitions
│   ├── controllers/              # Route handlers (HTTP req/res)
│   │   ├── companyController.js  # Company letterhead & profile
│   │   ├── employeeController.js # Employee CRUD & metrics
│   │   └── payrollController.js  # Salary computation & slip persistence
│   ├── middleware/               # Express middleware
│   │   ├── errorHandler.js       # Centralized error handler & 404 handler
│   │   ├── requestLogger.js      # Morgan HTTP logger stream connected to Winston
│   │   └── validator.js          # Request payload validation
│   ├── models/                   # Data access layer (MySQL queries)
│   │   ├── Company.js            # Company data access
│   │   ├── Employee.js           # Employee data access & analytics
│   │   └── Payroll.js            # Payroll data access & disbursements
│   ├── routes/                   # Clean REST API endpoints
│   │   ├── companyRoutes.js      # /api/company
│   │   ├── employeeRoutes.js     # /api/employees
│   │   └── payrollRoutes.js      # /api/payroll
│   ├── services/                 # Pure business logic
│   │   ├── payrollCalculator.js  # Earnings, deductions, pro-rating, tax
│   │   └── pdfGenerator.js       # Clean print-ready HTML payslip generator
│   ├── utils/                    # Helper utilities
│   │   ├── logger.js             # Winston logger configuration
│   │   ├── currencyFormatter.js  # Monetary formatting (INR / ₹)
│   │   └── numberToWords.js      # Formal Indian number-to-words algorithm
│   └── server.js                 # Express application entrypoint
├── .env.example                  # Environment template
├── .env                          # Local environment variables
└── package.json                  # Dependencies & scripts
```

---

## Key Features

1. **MySQL Database Integration**:
   - Connection pooling with `mysql2/promise`.
   - Automatic database and table creation (`CREATE DATABASE IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`).
   - Resilient development fallback: if MySQL service is not yet running, the server gracefully activates in-memory mock mode with diagnostics, allowing instant testing without crashes.
2. **Comprehensive Logging**:
   - Winston with console formatting and daily/sized file rotation in `/logs`.
   - Error logs are isolated in `logs/error.log`.
   - Incoming HTTP requests captured via Morgan in `logs/combined.log`.
3. **Robust Payroll Engine**:
   - Pro-rated calculations based on working days and leaves.
   - Comprehensive earnings breakup: Basic, HRA, Conveyance, Medical, Special Allowance, Overtime, Bonus.
   - Statutory deductions: Provident Fund (PF), Professional Tax (PT), TDS, ESI.
   - Converts final net pay to words (e.g. *One Lakh Twenty-Four Thousand Six Hundred Rupees Only*).
4. **Developer-Friendly Documentation**:
   - Every file features explicit JSDoc header comments explaining its role and functions.

---

## REST API Specification

### Health Check
- `GET /api/health` - Check server status and database connectivity.

### Employees
- `GET /api/employees` - List all employees (Query params: `search`, `department`, `status`).
- `GET /api/employees/stats/summary` - Total employee count, active employees, department breakdown.
- `GET /api/employees/:id` - Fetch single employee.
- `POST /api/employees` - Create new employee.
- `PUT /api/employees/:id` - Update employee details or salary components.
- `DELETE /api/employees/:id` - Delete employee.

### Payroll & Salary Slips
- `GET /api/payroll` - List all generated salary slips (Query params: `month`, `year`, `employee_id`, `status`).
- `GET /api/payroll/summary/stats` - Total gross disbursed, total deductions, net paid.
- `GET /api/payroll/:id` - Fetch single salary slip.
- `GET /api/payroll/:id/html` - Direct print-ready HTML view of the salary slip.
- `POST /api/payroll/preview` - Preview salary calculation without saving.
- `POST /api/payroll/generate` - Compute and persist salary slip in the database.
- `DELETE /api/payroll/:id` - Delete salary slip.

### Company Profile
- `GET /api/company` - Fetch company profile & letterhead info.
- `PUT /api/company` - Update company profile & letterhead info.

---

## Getting Started

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Configure `.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=salary_slip_db
   ```
3. Start the server:
   ```bash
   npm run dev    # For development with nodemon
   npm start      # For production
   ```
