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

export default {
    getLogger
};
