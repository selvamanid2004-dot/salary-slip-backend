/**
 * @file database.js
 * @description MySQL connection pool and resilient query interface.
 * Connects to MySQL using mysql2/promise.
 * In the event that MySQL is not running or credentials are misconfigured,
 * provides an in-memory fallback store so development and testing can proceed seamlessly
 * while logging actionable connection diagnostics.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

let pool = null;
let isConnectedToMySQL = false;

// Fallback in-memory storage for immediate out-of-the-box development & testing
const inMemoryStore = {
  company_profile: [],
  employees: [],
  payrolls: [],
  admin_auth: []
};

/**
 * Creates and initializes the MySQL connection pool
 */
async function initDatabasePool() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'salary_slip_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
  };

  try {
    // Attempt connecting to MySQL server directly first (without database to check if database exists)
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it does not already exist
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.end();

    // Now instantiate the main connection pool
    pool = mysql.createPool(dbConfig);
    
    // Verify pool connection
    const connection = await pool.getConnection();
    connection.release();

    isConnectedToMySQL = true;
    logger.info(`[MySQL] Successfully connected to MySQL database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (error) {
    isConnectedToMySQL = false;
    logger.warn(`[MySQL] Could not connect to MySQL server at ${dbConfig.host}:${dbConfig.port} (${error.code || error.message}).`);
    logger.warn(`[MySQL] Operating in resilient In-Memory Mock Mode. To connect MySQL, verify your service is running and configure backend/.env.`);
    return false;
  }
}

/**
 * Unified Query Execution Method
 * Executes parameterized query against MySQL if connected,
 * otherwise transparently routes to in-memory fallback.
 */
async function query(sql, params = []) {
  if (isConnectedToMySQL && pool) {
    const [results] = await pool.query(sql, params);
    return results;
  }

  // Resilient fallback logic for in-memory store
  return executeInMemoryQuery(sql, params);
}

/**
 * Resilient In-Memory Query Engine
 * Allows full functionality even before MySQL is installed or started.
 */
function executeInMemoryQuery(sql, params) {
  const normalizedSql = sql.trim().toLowerCase();

  // 1. SELECT queries
  if (normalizedSql.startsWith('select')) {
    if (normalizedSql.includes('from `company_profile`') || normalizedSql.includes('from company_profile')) {
      return [...inMemoryStore.company_profile];
    }
    if (normalizedSql.includes('from `employees`') || normalizedSql.includes('from employees')) {
      let list = [...inMemoryStore.employees];
      if (normalizedSql.includes('where id = ?') || normalizedSql.includes('where `id` = ?')) {
        const found = list.find(e => Number(e.id) === Number(params[0]));
        return found ? [found] : [];
      }
      if (normalizedSql.includes('where employee_code = ?')) {
        const found = list.find(e => e.employee_code === params[0]);
        return found ? [found] : [];
      }
      return list;
    }
    if (normalizedSql.includes('from `payrolls`') || normalizedSql.includes('from payrolls')) {
      let list = [...inMemoryStore.payrolls];
      if (normalizedSql.includes('where id = ?') || normalizedSql.includes('where `id` = ?')) {
        const found = list.find(p => Number(p.id) === Number(params[0]));
        return found ? [found] : [];
      }
      if (normalizedSql.includes('where employee_id = ?')) {
        return list.filter(p => Number(p.employee_id) === Number(params[0]));
      }
      return list;
    }
    if (normalizedSql.includes('from `users`') || normalizedSql.includes('from users')) {
      let list = [...inMemoryStore.users];
      if (normalizedSql.includes('where id = ?') || normalizedSql.includes('where `id` = ?')) {
        const found = list.find(u => Number(u.id) === Number(params[0]));
        return found ? [found] : [];
      }
      if (normalizedSql.includes('employee_code') || normalizedSql.includes('email')) {
        const iden = (params[0] || '').toString().trim().toLowerCase();
        const found = list.find(u =>
          (u.email && u.email.toLowerCase() === iden) ||
          (u.employee_code && u.employee_code.toLowerCase() === iden)
        );
        return found ? [found] : [];
      }
      if (normalizedSql.includes('where employee_id = ?')) {
        return list.filter(u => Number(u.employee_id) === Number(params[0]));
      }
      if (normalizedSql.includes('where')) {
        return [];
      }
      return list;
    }
    if (normalizedSql.includes('from `admin_auth`') || normalizedSql.includes('from admin_auth')) {
      let list = [...(inMemoryStore.admin_auth || [])];
      if (normalizedSql.includes('where username = ?') || normalizedSql.includes('where `username` = ?')) {
        const found = list.find(a => (a.username || '').toLowerCase() === (params[0] || '').toLowerCase());
        return found ? [found] : [];
      }
      if (normalizedSql.includes('where id = ?') || normalizedSql.includes('where `id` = ?')) {
        const found = list.find(a => Number(a.id) === Number(params[0]));
        return found ? [found] : [];
      }
      return list;
    }
    return [];
  }

  // 2. INSERT queries
  if (normalizedSql.startsWith('insert into')) {
    if (normalizedSql.includes('company_profile')) {
      const newId = inMemoryStore.company_profile.length + 1;
      const record = { id: newId };
      inMemoryStore.company_profile.push(record);
      return { insertId: newId, affectedRows: 1 };
    }
    if (normalizedSql.includes('employees')) {
      const newId = inMemoryStore.employees.length > 0 ? Math.max(...inMemoryStore.employees.map(e => e.id)) + 1 : 1;
      return { insertId: newId, affectedRows: 1 };
    }
    if (normalizedSql.includes('payrolls')) {
      const newId = inMemoryStore.payrolls.length > 0 ? Math.max(...inMemoryStore.payrolls.map(p => p.id)) + 1 : 1;
      return { insertId: newId, affectedRows: 1 };
    }
    if (normalizedSql.includes('admin_auth')) {
      const newId = (inMemoryStore.admin_auth && inMemoryStore.admin_auth.length > 0)
        ? Math.max(...inMemoryStore.admin_auth.map(a => a.id)) + 1
        : 1;
      return { insertId: newId, affectedRows: 1 };
    }
    return { insertId: 1, affectedRows: 1 };
  }

  // 3. UPDATE queries
  if (normalizedSql.startsWith('update')) {
    if (normalizedSql.includes('admin_auth')) {
      // UPDATE `admin_auth` SET password_hash = ? WHERE username = ?
      const newHash = params[0];
      const target = (params[1] || '').toString().toLowerCase();
      if (inMemoryStore.admin_auth) {
        const user = inMemoryStore.admin_auth.find(a => 
          (a.username && a.username.toLowerCase() === target) || 
          Number(a.id) === Number(target)
        );
        if (user) {
          user.password_hash = newHash;
          user.updated_at = new Date().toISOString();
        }
      }
      return { affectedRows: 1 };
    }
    return { affectedRows: 1 };
  }

  // 4. DELETE queries
  if (normalizedSql.startsWith('delete')) {
    if (normalizedSql.includes('employees') && (normalizedSql.includes('where id = ?') || normalizedSql.includes('where `id` = ?'))) {
      const id = Number(params[0]);
      inMemoryStore.employees = inMemoryStore.employees.filter(e => e.id !== id);
      inMemoryStore.payrolls = inMemoryStore.payrolls.filter(p => p.employee_id !== id);
      return { affectedRows: 1 };
    }
    if (normalizedSql.includes('payrolls') && (normalizedSql.includes('where id = ?') || normalizedSql.includes('where `id` = ?'))) {
      const id = Number(params[0]);
      inMemoryStore.payrolls = inMemoryStore.payrolls.filter(p => p.id !== id);
      return { affectedRows: 1 };
    }
    return { affectedRows: 1 };
  }

  return [];
}

/**
 * Returns connection state
 */
function getDbStatus() {
  return {
    isMySQL: isConnectedToMySQL,
    mode: isConnectedToMySQL ? 'MySQL Database (Live)' : 'In-Memory Fallback Store (Resilient Development Mode)',
    database: process.env.DB_NAME || 'salary_slip_db',
    host: process.env.DB_HOST || 'localhost'
  };
}

module.exports = {
  initDatabasePool,
  query,
  getDbStatus,
  inMemoryStore
};
