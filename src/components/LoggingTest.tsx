/**
 * Test component to verify logging functionality in the app
 * Can be temporarily added to the main app for testing
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { logger } from '../utils/logger';
import { testLogging } from '../utils/testLogger';

interface LoggingTestProps {
  onClose?: () => void;
}

export const LoggingTest: React.FC<LoggingTestProps> = ({ onClose }) => {
  useEffect(() => {
    logger.ui.info('LoggingTest component mounted');
    return () => {
      logger.ui.info('LoggingTest component unmounted');
    };
  }, []);

  const runBasicTest = () => {
    logger.ui.info('Running basic logging test...');
    
    // Test all contexts
    logger.app.info('App test message');
    logger.iap.info('IAP test message', { test: true });
    logger.vpn.warn('VPN test warning');
    logger.session.error('Session test error', undefined, new Error('Test error'));
    logger.ads.debug('Ads debug message');
    
    Alert.alert('Basic Test', 'Check console for logging output');
  };

  const runComprehensiveTest = () => {
    logger.ui.info('Running comprehensive logging test...');
    
    const results = testLogging();
    
    Alert.alert(
      'Comprehensive Test Results',
      `Total Logs: ${results.totalLogs}\nRecent: ${results.recentLogs}\nIAP: ${results.iapLogs}\nErrors: ${results.errorLogs}\nExport Size: ${results.exportSize} chars`
    );
  };

  const dumpRecentLogs = () => {
    logger.ui.info('Dumping recent logs to console...');
    logger.dumpRecentLogs(20);
    Alert.alert('Log Dump', 'Check console for recent logs output');
  };

  const clearLogs = () => {
    const logCount = logger.getLogs().length;
    logger.clearLogs();
    logger.ui.info('Logs cleared', { previousCount: logCount });
    Alert.alert('Logs Cleared', `Cleared ${logCount} logs`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logging Test Panel</Text>
      
      <TouchableOpacity style={styles.button} onPress={runBasicTest}>
        <Text style={styles.buttonText}>Run Basic Test</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={runComprehensiveTest}>
        <Text style={styles.buttonText}>Run Comprehensive Test</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={dumpRecentLogs}>
        <Text style={styles.buttonText}>Dump Recent Logs</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={clearLogs}>
        <Text style={styles.buttonText}>Clear Logs</Text>
      </TouchableOpacity>
      
      {onClose && (
        <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
          <Text style={styles.buttonText}>Close Test Panel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  closeButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default LoggingTest;