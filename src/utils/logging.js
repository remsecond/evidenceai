/**
 * Logging utility functions
 */

/**
 * Get logger instance
 */
export function getLogger() {
    return {
        info: (message, context = {}) => {
            console.log(`[INFO] ${message}`, context);
        },
        debug: (message, context = {}) => {
            console.log(`[DEBUG] ${message}`, context);
        },
        warn: (message, context = {}) => {
            console.warn(`[WARN] ${message}`, context);
        },
        error: (message, context = {}) => {
            console.error(`[ERROR] ${message}`, context);
        }
    };
}

/**
 * Log error with context
 */
export function logError(error, context = {}) {
    console.error(`[ERROR] ${error.message}`, {
        ...context,
        stack: error.stack,
        name: error.name
    });
}

/**
 * Setup logging configuration
 */
export function setupLogging(options = {}) {
    const config = {
        level: options.level || 'info',
        format: options.format || 'json',
        timestamp: options.timestamp !== false,
        ...options
    };

    return {
        config,
        initialized: true
    };
}

/**
 * Track error with metadata
 */
export function trackError(error, metadata = {}) {
    const errorInfo = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        ...metadata,
        timestamp: new Date().toISOString()
    };

    console.error('[ERROR]', errorInfo);
    return errorInfo;
}

export default {
    getLogger,
    logError,
    setupLogging,
    trackError
};
