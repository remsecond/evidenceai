/**
 * Simple logging utility for consistent log formatting
 */
class Logger {
  constructor(name) {
    this.name = name;
  }

  info(message, data = null) {
    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    console.log(`[INFO] ${logMessage}`);
  }

  error(message, error = null) {
    const errorDetails = error ? `: ${error.message || error}` : '';
    console.error(`[ERROR] ${message}${errorDetails}`);
  }

  warn(message) {
    console.warn(`[WARN] ${message}`);
  }

  debug(message, data = null) {
    if (process.env.DEBUG) {
      const debugData = data ? ` ${JSON.stringify(data)}` : '';
      console.debug(`[DEBUG] ${message}${debugData}`);
    }
  }
}

const getLogger = (name) => new Logger(name);

export {
  getLogger
};
