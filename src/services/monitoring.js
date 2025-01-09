import { getLogger } from '../utils/logging.js';

const logger = getLogger();

// Store metrics in memory
const metrics = {
    processing: new Map(),
    batches: new Map(),
    queues: new Map()
};

/**
 * Get current metrics
 */
export function getMetrics() {
    const result = {
        processing: {},
        batches: {},
        queues: {},
        summary: {
            total_operations: metrics.processing.size,
            total_batches: metrics.batches.size,
            active_queues: metrics.queues.size
        }
    };

    // Process operation metrics
    metrics.processing.forEach((times, operation) => {
        result.processing[operation] = {
            avg_duration: times.reduce((a, b) => a + b, 0) / times.length,
            min_duration: Math.min(...times),
            max_duration: Math.max(...times),
            total_operations: times.length
        };
    });

    // Process batch metrics
    metrics.batches.forEach((data, operation) => {
        result.batches[operation] = {
            avg_size: data.sizes.reduce((a, b) => a + b, 0) / data.sizes.length,
            avg_duration: data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
            total_batches: data.sizes.length
        };
    });

    // Process queue metrics
    metrics.queues.forEach((lengths, operation) => {
        result.queues[operation] = {
            current_length: lengths[lengths.length - 1],
            avg_length: lengths.reduce((a, b) => a + b, 0) / lengths.length,
            max_length: Math.max(...lengths)
        };
    });

    return result;
}

/**
 * Track processing time for operations
 */
export function trackProcessingTime(operation, duration) {
    try {
        if (!metrics.processing.has(operation)) {
            metrics.processing.set(operation, []);
        }
        metrics.processing.get(operation).push(duration);

        logger.debug('Processing time tracked', {
            operation,
            duration_ms: duration
        });
    } catch (error) {
        logger.error('Error tracking processing time', { error });
    }
}

/**
 * Track batch processing metrics
 */
export function trackBatch(operation, size, duration) {
    try {
        if (!metrics.batches.has(operation)) {
            metrics.batches.set(operation, { sizes: [], durations: [] });
        }
        const data = metrics.batches.get(operation);
        data.sizes.push(size);
        data.durations.push(duration);

        logger.debug('Batch tracked', {
            operation,
            batch_size: size,
            duration_ms: duration
        });
    } catch (error) {
        logger.error('Error tracking batch', { error });
    }
}

/**
 * Track queue length
 */
export function trackQueueLength(operation, length) {
    try {
        if (!metrics.queues.has(operation)) {
            metrics.queues.set(operation, []);
        }
        metrics.queues.get(operation).push(length);

        logger.debug('Queue length tracked', {
            operation,
            queue_length: length
        });
    } catch (error) {
        logger.error('Error tracking queue length', { error });
    }
}

/**
 * Track error occurrences
 */
export function trackError(error, context = {}) {
    try {
        logger.error('Error tracked', {
            error_type: error.name,
            error_message: error.message,
            stack: error.stack,
            ...context
        });
    } catch (err) {
        logger.error('Error tracking error', { error: err });
    }
}

/**
 * Track parsing result metrics
 */
export function trackParsingResult(result, context = {}) {
    try {
        if (!metrics.processing.has('parsing_results')) {
            metrics.processing.set('parsing_results', []);
        }
        metrics.processing.get('parsing_results').push({
            success: result.success,
            error: result.error,
            metadata: result.metadata,
            context,
            timestamp: Date.now()
        });

        logger.debug('Parsing result tracked', {
            success: result.success,
            context
        });
    } catch (error) {
        logger.error('Error tracking parsing result', { error });
    }
}

/**
 * Track model usage metrics
 */
export function trackModelUsage(model, operation, tokens) {
    try {
        if (!metrics.processing.has('model_usage')) {
            metrics.processing.set('model_usage', []);
        }
        metrics.processing.get('model_usage').push({
            model,
            operation,
            tokens,
            timestamp: Date.now()
        });

        logger.debug('Model usage tracked', {
            model,
            operation,
            tokens
        });
    } catch (error) {
        logger.error('Error tracking model usage', { error });
    }
}

export default {
    trackProcessingTime,
    trackBatch,
    trackQueueLength,
    getMetrics,
    trackError,
    trackModelUsage,
    trackParsingResult
};
