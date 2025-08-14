#!/usr/bin/env node
/**
 * Simple Express server for Cloakr receipt validation
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { setupReceiptValidationEndpoint } = require('./receiptValidation_v2');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Setup receipt validation endpoints
setupReceiptValidationEndpoint(app);

// Start server
app.listen(PORT, () => {
  console.log(`Cloakr Receipt Validation Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Receipt validation: http://localhost:${PORT}/api/verifyReceipt`);
  
  // Environment check
  if (!process.env.APPLE_SHARED_SECRET) {
    console.warn('⚠️  APPLE_SHARED_SECRET environment variable not set');
    console.warn('   Receipt validation will fail without this secret from App Store Connect');
  } else {
    console.log('✅ APPLE_SHARED_SECRET is configured');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});