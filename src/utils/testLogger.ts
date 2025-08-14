/**
 * Test script for the centralized logging utility
 * Run this to verify logging is working correctly
 */

import { logger, LogLevel } from './logger';

export function testLogging() {
  console.log('\n=== TESTING CLOAKR LOGGING UTILITY ===\n');

  // Test all log levels
  logger.app.debug('This is a debug message', { testData: 'debug test' });
  logger.app.info('This is an info message', { testData: 'info test' });
  logger.app.warn('This is a warning message', { testData: 'warn test' });
  logger.app.error('This is an error message', { testData: 'error test' }, new Error('Test error'));

  // Test different contexts
  logger.iap.info('IAP context test', { productId: 'test.product' });
  logger.vpn.info('VPN context test', { status: 'connected' });
  logger.session.info('Session context test', { duration: 3600 });
  logger.ads.info('Ads context test', { adLoaded: true });
  logger.network.info('Network context test', { url: 'https://example.com' });
  logger.storage.info('Storage context test', { key: 'test_key' });
  logger.ui.info('UI context test', { screen: 'main' });
  logger.paywall.info('Paywall context test', { shown: true });
  logger.config.info('Config context test', { premium: false });
  logger.native.info('Native context test', { module: 'VPNManager' });

  // Test timing functions
  logger.time('test_timer', 'Test timer operation');
  setTimeout(() => {
    logger.timeEnd('test_timer', 'Test timer operation');
  }, 100);

  // Test log level filtering
  const originalLevel = logger.getMinLevel();
  logger.setMinLevel(LogLevel.WARN);
  logger.debug('app', 'This debug message should be filtered out', { filtered: true });
  logger.warn('app', 'This warning should appear even with WARN level', { visible: true });
  logger.setMinLevel(originalLevel);

  // Test log retrieval
  const recentLogs = logger.getLogs().slice(-5);
  console.log('\n=== RECENT LOGS ===');
  recentLogs.forEach((log, index) => {
    console.log(`${index + 1}. [${log.level}] [${log.context}] ${log.message}`);
  });

  // Test context filtering
  const iapLogs = logger.getLogsByContext('IAP' as any);
  console.log(`\n=== IAP LOGS (${iapLogs.length} found) ===`);

  // Test level filtering
  const errorLogs = logger.getLogsByLevel(LogLevel.ERROR);
  console.log(`\n=== ERROR LOGS (${errorLogs.length} found) ===`);

  // Test log export
  console.log('\n=== EXPORT TEST ===');
  const exportedLogs = logger.exportLogs();
  console.log(`Exported ${exportedLogs.length} characters of log data`);

  console.log('\n=== LOGGING TEST COMPLETED ===\n');

  return {
    totalLogs: logger.getLogs().length,
    recentLogs: recentLogs.length,
    iapLogs: iapLogs.length,
    errorLogs: errorLogs.length,
    exportSize: exportedLogs.length
  };
}

// Export for use in app
export default testLogging;