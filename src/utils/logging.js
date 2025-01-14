/**
 * Enhanced logging utility for consistent log formatting with timestamps
 */
class Logger {
  constructor(name) {
    this.name = name || 'default';
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.formatTimestamp();
    const moduleName = this.name ? `[${this.name}]` : '';
    const details = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    return `${timestamp} ${level} ${moduleName} ${message}${details}`;
  }

  info(message, data = null) {
    console.log(this.formatMessage('[INFO]', message, data));
  }

  error(message, error = null) {
    const errorDetails = error instanceof Error ? error.stack : error;
    console.error(this.formatMessage('[ERROR]', message, errorDetails));
  }

  warn(message, data = null) {
    console.warn(this.formatMessage('[WARN]', message, data));
  }

  debug(message, data = null) {
    if (process.env.DEBUG) {
      console.debug(this.formatMessage('[DEBUG]', message, data));
    }
  }

  trace(message, data = null) {
    if (process.env.TRACE) {
      console.debug(this.formatMessage('[TRACE]', message, data));
    }
  }
}

/**
 * Get a logger instance with an optional name
 * @param {string} name Optional name for the logger (typically module/class name)
 * @returns {Logger} Logger instance
 */
const getLogger = (name) => new Logger(name);

export {
  getLogger
};
