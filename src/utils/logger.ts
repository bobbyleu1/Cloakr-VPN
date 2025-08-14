/**
 * Centralized logging utility for Cloakr VPN app
 * Provides structured logging with different levels and contexts
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum LogContext {
  APP = 'APP',
  VPN = 'VPN',
  IAP = 'IAP',
  SESSION = 'SESSION',
  ADS = 'ADS',
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  UI = 'UI',
  PAYWALL = 'PAYWALL',
  CONFIG = 'CONFIG',
  NATIVE = 'NATIVE',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private minLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private remoteLoggingUrl = __DEV__ ? 'http://192.168.7.138:8080/logs' : 'https://yhzvxiwxxpkcneqtbgeu.supabase.co/functions/v1/logs'; // Remote logging server

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private createLogEntry(
    level: LogLevel,
    context: LogContext,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      context,
      message,
      data,
      error,
    };
  }

  private addToMemory(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatForConsole(entry: LogEntry): string {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    return `[${timestamp}] ${levelNames[entry.level]} [${entry.context}] ${entry.message}`;
  }

  private log(
    level: LogLevel,
    context: LogContext,
    message: string,
    data?: any,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, context, message, data, error);
    this.addToMemory(entry);

    const formattedMessage = this.formatForConsole(entry);

    // Log to console with appropriate method
    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage, data ? data : '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data ? data : '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data ? data : '', error ? error : '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data ? data : '', error ? error : '');
        break;
    }

    // For physical devices: also send to remote logging
    if (__DEV__ && !global.isRemoteDebuggingEnabled) {
      this.sendToRemoteLogging(entry);
    }
  }

  // Public logging methods
  debug(context: LogContext, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  info(context: LogContext, message: string, data?: any): void {
    this.log(LogLevel.INFO, context, message, data);
  }

  warn(context: LogContext, message: string, data?: any, error?: Error): void {
    this.log(LogLevel.WARN, context, message, data, error);
  }

  error(context: LogContext, message: string, data?: any, error?: Error): void {
    this.log(LogLevel.ERROR, context, message, data, error);
  }

  // Context-specific logging helpers
  app = {
    debug: (message: string, data?: any) => this.debug(LogContext.APP, message, data),
    info: (message: string, data?: any) => this.info(LogContext.APP, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.APP, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.APP, message, data, error),
  };

  vpn = {
    debug: (message: string, data?: any) => this.debug(LogContext.VPN, message, data),
    info: (message: string, data?: any) => this.info(LogContext.VPN, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.VPN, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.VPN, message, data, error),
  };

  iap = {
    debug: (message: string, data?: any) => this.debug(LogContext.IAP, message, data),
    info: (message: string, data?: any) => this.info(LogContext.IAP, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.IAP, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.IAP, message, data, error),
  };

  session = {
    debug: (message: string, data?: any) => this.debug(LogContext.SESSION, message, data),
    info: (message: string, data?: any) => this.info(LogContext.SESSION, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.SESSION, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.SESSION, message, data, error),
  };

  ads = {
    debug: (message: string, data?: any) => this.debug(LogContext.ADS, message, data),
    info: (message: string, data?: any) => this.info(LogContext.ADS, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.ADS, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.ADS, message, data, error),
  };

  network = {
    debug: (message: string, data?: any) => this.debug(LogContext.NETWORK, message, data),
    info: (message: string, data?: any) => this.info(LogContext.NETWORK, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.NETWORK, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.NETWORK, message, data, error),
  };

  storage = {
    debug: (message: string, data?: any) => this.debug(LogContext.STORAGE, message, data),
    info: (message: string, data?: any) => this.info(LogContext.STORAGE, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.STORAGE, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.STORAGE, message, data, error),
  };

  ui = {
    debug: (message: string, data?: any) => this.debug(LogContext.UI, message, data),
    info: (message: string, data?: any) => this.info(LogContext.UI, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.UI, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.UI, message, data, error),
  };

  paywall = {
    debug: (message: string, data?: any) => this.debug(LogContext.PAYWALL, message, data),
    info: (message: string, data?: any) => this.info(LogContext.PAYWALL, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.PAYWALL, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.PAYWALL, message, data, error),
  };

  config = {
    debug: (message: string, data?: any) => this.debug(LogContext.CONFIG, message, data),
    info: (message: string, data?: any) => this.info(LogContext.CONFIG, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.CONFIG, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.CONFIG, message, data, error),
  };

  native = {
    debug: (message: string, data?: any) => this.debug(LogContext.NATIVE, message, data),
    info: (message: string, data?: any) => this.info(LogContext.NATIVE, message, data),
    warn: (message: string, data?: any, error?: Error) => this.warn(LogContext.NATIVE, message, data, error),
    error: (message: string, data?: any, error?: Error) => this.error(LogContext.NATIVE, message, data, error),
  };

  // Utility methods
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByContext(context: LogContext): LogEntry[] {
    return this.logs.filter(log => log.context === context);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Export logs as JSON string for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Print recent logs to console (useful for debugging)
  dumpRecentLogs(count: number = 50): void {
    const recentLogs = this.logs.slice(-count);
    console.log(`\n=== RECENT LOGS (last ${recentLogs.length}) ===`);
    recentLogs.forEach(log => {
      console.log(this.formatForConsole(log));
      if (log.data) console.log('  Data:', log.data);
      if (log.error) console.log('  Error:', log.error);
    });
    console.log('=== END RECENT LOGS ===\n');
  }

  // Performance timing helpers
  time(context: LogContext, label: string): void {
    this.debug(context, `Timer started: ${label}`);
    console.time(`[${context}] ${label}`);
  }

  timeEnd(context: LogContext, label: string): void {
    console.timeEnd(`[${context}] ${label}`);
    this.debug(context, `Timer ended: ${label}`);
  }

  // Remote logging for physical device debugging
  private sendToRemoteLogging(entry: LogEntry): void {
    try {
      const payload = {
        ...entry,
        deviceInfo: {
          platform: 'ios',
          timestamp: Date.now()
        }
      };

      // Send to remote logging server (non-blocking)
      fetch(this.remoteLoggingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail - don't want logging to break the app
      });
    } catch (error) {
      // Silently fail - don't want logging to break the app
    }
  }

  // Enable remote logging server
  startRemoteLogging(): void {
    if (__DEV__ && !global.isRemoteDebuggingEnabled) {
      console.log('🔍 Remote logging enabled. Logs will be sent to ' + this.remoteLoggingUrl);
      this.info(LogContext.APP, 'Remote logging started');
    }
  }

  // Enable immediate visible logging for physical devices
  enableVisibleLogging(): void {
    console.log('📱 PHYSICAL DEVICE LOGGING ENABLED - ALL LOGS WILL BE VISIBLE');
    console.log('='.repeat(60));
    
    // Override console methods to ensure visibility
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog('📱 LOG:', ...args);
    };

    console.info = (...args) => {
      originalInfo('📱 INFO:', ...args);
    };

    console.warn = (...args) => {
      originalWarn('📱 WARN:', ...args);
    };

    console.error = (...args) => {
      originalError('📱 ERROR:', ...args);
    };

    this.info(LogContext.APP, 'Visible logging enabled for physical device');
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for easier imports
export default logger;