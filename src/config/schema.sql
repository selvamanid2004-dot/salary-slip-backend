-- ====================================================================
-- Salary Slip & Employee Management Database Schema
-- Database: MySQL 8.0+ / MariaDB 10.3+
-- ====================================================================

-- 1. Company Profile Table (Single-row configuration for company letterhead)
CREATE TABLE IF NOT EXISTS `company_profile` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(255) NOT NULL,
  `tagline` VARCHAR(255) DEFAULT '',
  `address_line1` VARCHAR(255) NOT NULL,
  `address_line2` VARCHAR(255) DEFAULT '',
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `postal_code` VARCHAR(20) NOT NULL,
  `country` VARCHAR(100) DEFAULT 'India',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `website` VARCHAR(150) DEFAULT '',
  `pan_number` VARCHAR(50) DEFAULT '',
  `gst_number` VARCHAR(50) DEFAULT '',
  `currency_symbol` VARCHAR(10) DEFAULT '₹',
  `currency_code` VARCHAR(10) DEFAULT 'INR',
  `authorized_signatory_name` VARCHAR(150) DEFAULT 'HR Manager',
  `authorized_signatory_title` VARCHAR(150) DEFAULT 'Authorized Signatory',
  `logo_url` LONGTEXT DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Employees Master Table
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_code` VARCHAR(50) NOT NULL UNIQUE,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(30) DEFAULT '',
  `date_of_birth` DATE DEFAULT NULL,
  `gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
  `designation` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `date_of_joining` DATE NOT NULL,
  `employment_type` ENUM('Full-Time', 'Part-Time', 'Contract', 'Intern') DEFAULT 'Full-Time',
  `status` ENUM('Active', 'Inactive', 'On-Leave', 'Terminated') DEFAULT 'Active',
  
  -- Bank & Tax Identifiers
  `pan_number` VARCHAR(30) DEFAULT '',
  `pf_uan` VARCHAR(30) DEFAULT '',
  `bank_name` VARCHAR(100) DEFAULT '',
  `bank_account_no` VARCHAR(50) DEFAULT '',
  `bank_ifsc_code` VARCHAR(30) DEFAULT '',
  
  -- Monthly Salary Package Components (in base currency)
  `basic_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `hra` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `conveyance_allowance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `medical_allowance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `special_allowance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `pf_employee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `pf_employer` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `professional_tax` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_department` (`department`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Payrolls & Salary Slips Table
CREATE TABLE IF NOT EXISTS `payrolls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slip_number` VARCHAR(50) NOT NULL UNIQUE,
  `employee_id` INT NOT NULL,
  `month` TINYINT UNSIGNED NOT NULL,
  `year` SMALLINT UNSIGNED NOT NULL,
  `payment_date` DATE NOT NULL,
  
  -- Attendance
  `total_working_days` TINYINT UNSIGNED NOT NULL DEFAULT 30,
  `days_worked` DECIMAL(4, 1) NOT NULL DEFAULT 30.0,
  `paid_leaves` DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
  `unpaid_leaves` DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
  
  -- Calculated Earnings for the Month
  `basic_pay` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `hra_pay` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `conveyance_pay` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `medical_pay` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `special_allowance_pay` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `bonus` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `overtime_pay` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `gross_earnings` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Calculated Deductions for the Month
  `pf_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `professional_tax_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tds_tax_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `esi_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `other_deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Net Salary
  `net_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `net_salary_in_words` TEXT NOT NULL,
  
  -- Status & Metadata
  `payment_status` ENUM('Generated', 'Pending', 'Paid') DEFAULT 'Paid',
  `payment_method` ENUM('Bank Transfer', 'Cheque', 'Cash', 'Direct Deposit') DEFAULT 'Bank Transfer',
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `idx_emp_month_year` (`employee_id`, `month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Admin Authentication & Password Management Table
CREATE TABLE IF NOT EXISTS `admin_auth` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(150) DEFAULT 'Administrator',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
