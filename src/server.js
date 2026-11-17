/**
 * @file server.js
 * @description Entrypoint for the Salary Slip & Employee Management Backend.
 * Configures Express, security middleware, logging, API routing, and database startup.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment configuration
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { initializeDatabase } = require('./config/initDb');
const { getDbStatus } = require('./config/database');

// Route imports
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { requireAuth } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration - Permissive for all frontend clients, Render deployments, and local dev
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins (browser frontend on Render, custom domains, localhost, mobile)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Device-Id',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['Authorization', 'X-Device-Id']
}));

// Explicit preflight handler for all routes
app.options('*', cors());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    // Preserve raw buffer for webhook signature verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach HTTP request logger (Morgan -> Winston)
app.use(requestLogger);

// Health & Diagnostics Endpoint (Publicly accessible for uptime monitors / load balancers)
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Employee Management & Salary Slip API',
    database: dbStatus
  });
});

// Mount modular API routes (Protected routes strictly guarded by requireAuth)
app.use('/api/auth', authRoutes);
app.use('/api/company', requireAuth, companyRoutes);
app.use('/api/employees', requireAuth, employeeRoutes);
app.use('/api/payroll', requireAuth, payrollRoutes);
app.use('/api/billing', requireAuth, invoiceRoutes);
app.use('/api/payments', paymentRoutes); // Razorpay order creation, verification & webhooks

// Production Static Serving: Serve compiled React SPA if in production
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV === 'production' && require('fs').existsSync(frontendDistPath)) {
  logger.info(`[Production] Serving static frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Development Root Welcome Endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'WorkPulse Employee Management & Salary Slip Backend API is running.',
      health: '/api/health',
      frontend: 'http://localhost:3000'
    });
  });
}

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

let serverInstance = null;

// Server Startup
async function startServer() {
  try {
    logger.info('====================================================');
    logger.info('Starting Employee Management & Salary Slip Backend...');
    logger.info('====================================================');

    // Start HTTP listener immediately so frontend and healthcheck are available instantly
    serverInstance = app.listen(PORT, () => {
      logger.info(`[Server] API server running successfully on http://localhost:${PORT}`);
      logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`[Server] Healthcheck available at: http://localhost:${PORT}/api/health`);
    });

    // Run database connection, schema verification, and session setup
    await initializeDatabase();
  } catch (error) {
    logger.error(`[Server] Fatal startup error: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
}

// Graceful process termination handlers
function handleGracefulShutdown(signal) {
  logger.info(`[Server] Received ${signal}. Gracefully shutting down HTTP server...`);
  if (serverInstance) {
    serverInstance.close(() => {
      logger.info('[Server] HTTP server closed cleanly. Exiting.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Server] Unhandled Promise Rejection:', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error(`[Server] Uncaught Exception: ${err.message}`, { stack: err.stack });
});

startServer();

module.exports = app;
