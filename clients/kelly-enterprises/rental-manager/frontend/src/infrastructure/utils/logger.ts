// Environment-aware logging service
interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

type LogLevelKey = keyof LogLevel;

interface LogContext {
  module?: string;
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: number;
  private enabledInProduction: Set<LogLevelKey>;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
    this.enabledInProduction = new Set(['WARN', 'ERROR']);
  }

  private shouldLog(level: LogLevelKey): boolean {
    if (this.isDevelopment) {
      return LOG_LEVELS[level] >= this.logLevel;
    }
    return this.enabledInProduction.has(level);
  }

  private formatMessage(level: LogLevelKey, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private logToConsole(level: LogLevelKey, message: string, data?: unknown, context?: LogContext): void {
    const formattedMessage = this.formatMessage(level, message, context);
    
    switch (level) {
      case 'DEBUG':
        console.debug(formattedMessage, data);
        break;
      case 'INFO':
        console.info(formattedMessage, data);
        break;
      case 'WARN':
        console.warn(formattedMessage, data);
        break;
      case 'ERROR':
        console.error(formattedMessage, data);
        break;
    }
  }

  private logToService(level: LogLevelKey, _message: string, _data?: unknown, _context?: LogContext): void {
    // In production, you would send to external logging service
    // For now, this is a placeholder for external logging integration
    if (!this.isDevelopment && (level === 'ERROR' || level === 'WARN')) {
      // Future: Implement external logging service integration
      // Example: send to DataDog, LogRocket, Sentry, etc.
      // logToExternalService({ level, message, data, context, timestamp: Date.now() });
    }
  }

  debug(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('DEBUG')) {
      this.logToConsole('DEBUG', message, data, context);
    }
  }

  info(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('INFO')) {
      this.logToConsole('INFO', message, data, context);
    }
  }

  warn(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('WARN')) {
      this.logToConsole('WARN', message, data, context);
      this.logToService('WARN', message, data, context);
    }
  }

  error(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('ERROR')) {
      this.logToConsole('ERROR', message, data, context);
      this.logToService('ERROR', message, data, context);
    }
  }

  // Convenience methods for common patterns
  dev(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      this.debug(`[DEV] ${message}`, data);
    }
  }

  api(message: string, data?: unknown, method?: string, endpoint?: string): void {
    this.debug(message, data, {
      module: 'API',
      method,
      endpoint
    });
  }

  component(component: string, message: string, data?: unknown): void {
    this.debug(message, data, {
      module: 'COMPONENT',
      component
    });
  }

  user(message: string, userId: string, action?: string, data?: unknown): void {
    this.info(message, data, {
      module: 'USER',
      userId,
      action
    });
  }

  performance(message: string, duration: number, context?: LogContext): void {
    this.debug(`[PERF] ${message} (${duration}ms)`, undefined, context);
  }

  // Error helpers
  errorWithStack(message: string, error: Error, context?: LogContext): void {
    this.error(message, {
      message: error.message,
      stack: error.stack,
      name: error.name
    }, context);
  }

  // Set log level dynamically (for debugging)
  setLogLevel(level: LogLevelKey): void {
    this.logLevel = LOG_LEVELS[level];
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  dev: logger.dev.bind(logger),
  api: logger.api.bind(logger),
  component: logger.component.bind(logger),
  user: logger.user.bind(logger),
  performance: logger.performance.bind(logger),
  errorWithStack: logger.errorWithStack.bind(logger)
};

// React hook for component logging
import { useCallback } from 'react';

export const useLogger = (componentName: string) => {
  const componentLogger = useCallback((message: string, data?: unknown) => {
    logger.component(componentName, message, data);
  }, [componentName]);

  return {
    log: componentLogger,
    debug: (message: string, data?: unknown) => logger.debug(message, data, { component: componentName }),
    info: (message: string, data?: unknown) => logger.info(message, data, { component: componentName }),
    warn: (message: string, data?: unknown) => logger.warn(message, data, { component: componentName }),
    error: (message: string, data?: unknown) => logger.error(message, data, { component: componentName }),
    errorWithStack: (message: string, error: Error) => logger.errorWithStack(message, error, { component: componentName })
  };
};