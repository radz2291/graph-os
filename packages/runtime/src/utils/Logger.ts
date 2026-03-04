/**
 * Logger utility for Graph-OS runtime
 * 
 * @module @graph-os/runtime
 */

import { LogLevel } from '@graph-os/core';

/**
 * Logger configuration options.
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Include timestamps in output */
  timestamp?: boolean;
  /** Output to file */
  file?: string;
  /** Prefix for all log messages */
  prefix?: string;
}

/**
 * Simple logger for runtime output.
 */
export class Logger {
  private level: LogLevel;
  private timestamp: boolean;
  private prefix: string;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.timestamp = options.timestamp ?? true;
    this.prefix = options.prefix || '';
  }

  /**
   * Sets the log level.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Sets the prefix for all log messages.
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * Checks if a log level should be output.
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.level];
  }

  /**
   * Formats a log message.
   */
  private formatMessage(level: LogLevel, ...args: unknown[]): string {
    const parts: string[] = [];
    
    if (this.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    parts.push(`[${level.toUpperCase()}]`);
    
    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }
    
    const message = args
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
      .join(' ');
    
    parts.push(message);
    
    return parts.join(' ');
  }

  /**
   * Logs a debug message.
   */
  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', ...args));
    }
  }

  /**
   * Logs an info message.
   */
  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', ...args));
    }
  }

  /**
   * Logs a warning message.
   */
  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', ...args));
    }
  }

  /**
   * Logs an error message.
   */
  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', ...args));
    }
  }

  /**
   * Logs a message at the specified level.
   */
  log(level: LogLevel, ...args: unknown[]): void {
    switch (level) {
      case 'debug':
        this.debug(...args);
        break;
      case 'info':
        this.info(...args);
        break;
      case 'warn':
        this.warn(...args);
        break;
      case 'error':
        this.error(...args);
        break;
    }
  }

  /**
   * Creates a child logger with a prefix.
   */
  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      timestamp: this.timestamp,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
    });
  }
}
