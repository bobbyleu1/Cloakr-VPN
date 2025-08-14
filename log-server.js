#!/usr/bin/env node

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// Store logs in memory
const logs = [];

app.post('/logs', (req, res) => {
  const logEntry = req.body;
  const timestamp = new Date().toISOString();
  
  logs.push({
    ...logEntry,
    receivedAt: timestamp
  });

  // Format and display the log
  const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  const levelName = levelNames[logEntry.level] || 'UNKNOWN';
  const time = logEntry.timestamp.split('T')[1].split('.')[0];
  
  // Color coding for different log levels
  const colors = {
    DEBUG: '\x1b[36m', // cyan
    INFO: '\x1b[32m',  // green  
    WARN: '\x1b[33m',  // yellow
    ERROR: '\x1b[31m', // red
  };
  
  const reset = '\x1b[0m';
  const color = colors[levelName] || '';
  
  console.log(`${color}📱 [${time}] ${levelName} [${logEntry.context}] ${logEntry.message}${reset}`);
  
  if (logEntry.data) {
    console.log(`   Data:`, logEntry.data);
  }
  
  if (logEntry.error) {
    console.log(`   Error:`, logEntry.error);
  }
  
  res.status(200).json({ success: true });
});

app.get('/logs', (req, res) => {
  res.json(logs);
});

app.get('/logs/clear', (req, res) => {
  logs.length = 0;
  console.log('🧹 Logs cleared');
  res.json({ message: 'Logs cleared', count: 0 });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔍 Remote logging server running on http://localhost:${PORT}`);
  console.log(`📱 Your iOS device can send logs to this server`);
  console.log(`🌐 Available endpoints:`);
  console.log(`   POST /logs - Receive logs from device`);
  console.log(`   GET /logs - View all logs as JSON`);
  console.log(`   GET /logs/clear - Clear all logs`);
  console.log('');
  console.log('📋 Waiting for logs from your iOS device...');
  console.log('═'.repeat(60));
});