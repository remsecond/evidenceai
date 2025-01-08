import { getLogger } from '../utils/logging.js';

const logger = getLogger();

/**
 * Track processing time for operations
 */
export function trackProcessingTime(operation, duration) {
    try {
        logger.debug('Processing time tracked', {
            operation,
            duration_ms: duration,
            timestamp: new Date().toISOString()
        });

        // Mock metrics storage
        const metrics = {
            operation,
            duration,
            timestamp: new Date().toISOString()
        };

        return metrics;
    } catch (error) {
        logger.error('Error tracking processing time', { error, operation });
        throw error;
    }
}

/**
 * Track errors in operations
 */
export function trackError(operation, error) {
    try {
        logger.error('Operation error tracked', {
            operation,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Mock error storage
        const errorRecord = {
            operation,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        return errorRecord;
    } catch (trackingError) {
        logger.error('Error tracking error', { trackingError, operation });
        throw trackingError;
    }
}

export default {
    trackProcessingTime,
    trackError
};
