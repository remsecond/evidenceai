import { getLogger } from '../utils/logging.js';
import { trackMetric, trackAlert } from './monitoring.js';

const logger = getLogger();

// Alert thresholds
const THRESHOLDS = {
    TOKEN_LIMIT_WARNING: 180000, // 90% of max
    CHUNK_SIZE_WARNING: 140000,  // 93% of chunk limit
    PROCESSING_TIME_WARNING: 30000, // 30 seconds
    CHUNK_COUNT_WARNING: 10 // Might indicate inefficient chunking
};

/**
 * Monitor chunking operations and alert on issues
 */
export async function monitorChunking(operation, metadata) {
    try {
        const {
            total_tokens,
            chunk_count,
            avg_chunk_size,
            processing_time
        } = extractMetrics(metadata);

        // Track basic metrics
        trackMetric('chunking.total_tokens', total_tokens);
        trackMetric('chunking.chunk_count', chunk_count);
        trackMetric('chunking.avg_chunk_size', avg_chunk_size);
        trackMetric('chunking.processing_time', processing_time);

        // Check for direct MCP tool usage
        if (!metadata.chunking?.enabled) {
            trackAlert('chunking.bypass', {
                message: 'Chunking disabled or bypassed',
                operation,
                metadata
            });
            logger.warn('Chunking bypass detected', { operation, metadata });
        }

        // Monitor token limits
        if (total_tokens > THRESHOLDS.TOKEN_LIMIT_WARNING) {
            trackAlert('chunking.token_limit', {
                message: 'Approaching token limit',
                total_tokens,
                limit: THRESHOLDS.TOKEN_LIMIT_WARNING
            });
        }

        // Monitor chunk sizes
        if (avg_chunk_size > THRESHOLDS.CHUNK_SIZE_WARNING) {
            trackAlert('chunking.chunk_size', {
                message: 'Large average chunk size',
                avg_chunk_size,
                limit: THRESHOLDS.CHUNK_SIZE_WARNING
            });
        }

        // Monitor processing time
        if (processing_time > THRESHOLDS.PROCESSING_TIME_WARNING) {
            trackAlert('chunking.processing_time', {
                message: 'Slow processing time',
                processing_time,
                limit: THRESHOLDS.PROCESSING_TIME_WARNING
            });
        }

        // Monitor chunk count
        if (chunk_count > THRESHOLDS.CHUNK_COUNT_WARNING) {
            trackAlert('chunking.chunk_count', {
                message: 'High chunk count',
                chunk_count,
                limit: THRESHOLDS.CHUNK_COUNT_WARNING
            });
        }

        // Track efficiency metrics
        const efficiency = calculateEfficiency(metadata);
        trackMetric('chunking.efficiency', efficiency);

        if (efficiency < 0.7) {
            trackAlert('chunking.efficiency', {
                message: 'Low chunking efficiency',
                efficiency,
                operation,
                metadata
            });
        }

        return {
            success: true,
            metrics: {
                total_tokens,
                chunk_count,
                avg_chunk_size,
                processing_time,
                efficiency
            }
        };

    } catch (error) {
        logger.error('Error monitoring chunking:', error);
        trackAlert('chunking.monitoring_error', {
            message: error.message,
            operation,
            metadata
        });
        throw error;
    }
}

/**
 * Extract metrics from metadata
 */
function extractMetrics(metadata) {
    const chunking = metadata.chunking || {};
    const processing = metadata.processing_stats || {};

    return {
        total_tokens: processing.total_tokens_processed || 0,
        chunk_count: chunking.chunk_count || chunking.total_chunks || 1,
        avg_chunk_size: processing.avg_chunk_size || 0,
        processing_time: metadata.processing_time || 0
    };
}

/**
 * Calculate chunking efficiency
 */
function calculateEfficiency(metadata) {
    const metrics = extractMetrics(metadata);
    
    // Perfect efficiency would be:
    // 1. Minimal number of chunks needed
    // 2. Even chunk sizes
    // 3. Fast processing time
    // 4. No wasted tokens

    const idealChunks = Math.ceil(metrics.total_tokens / 150000);
    const chunkEfficiency = idealChunks / metrics.chunk_count;

    const timePerToken = metrics.processing_time / metrics.total_tokens;
    const timeEfficiency = Math.min(1, 0.1 / timePerToken); // 0.1ms per token is ideal

    const sizeVariance = metadata.chunking?.size_variance || 0;
    const sizeEfficiency = 1 - (sizeVariance / metrics.avg_chunk_size);

    // Weight the factors
    return (
        (chunkEfficiency * 0.4) +
        (timeEfficiency * 0.3) +
        (sizeEfficiency * 0.3)
    );
}

/**
 * Generate monitoring report
 */
export async function generateChunkingReport(timeframe = '24h') {
    try {
        logger.info('Generating chunking report');

        // Get metrics for timeframe
        const metrics = await getMetrics(timeframe);

        // Analyze trends
        const trends = analyzeTrends(metrics);

        // Generate recommendations
        const recommendations = generateRecommendations(trends);

        return {
            timeframe,
            metrics,
            trends,
            recommendations,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('Error generating chunking report:', error);
        throw error;
    }
}

/**
 * Get metrics for timeframe
 */
async function getMetrics(timeframe) {
    // Implementation would pull from monitoring system
    return {
        total_documents: 0,
        total_tokens: 0,
        avg_chunk_size: 0,
        avg_processing_time: 0,
        efficiency: 0
    };
}

/**
 * Analyze metric trends
 */
function analyzeTrends(metrics) {
    return {
        token_usage: 'stable',
        processing_time: 'improving',
        efficiency: 'stable'
    };
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(trends) {
    const recommendations = [];

    if (trends.token_usage === 'increasing') {
        recommendations.push({
            type: 'token_usage',
            message: 'Consider adjusting chunk size thresholds',
            priority: 'medium'
        });
    }

    if (trends.processing_time === 'degrading') {
        recommendations.push({
            type: 'performance',
            message: 'Review parallel processing configuration',
            priority: 'high'
        });
    }

    if (trends.efficiency === 'degrading') {
        recommendations.push({
            type: 'efficiency',
            message: 'Audit chunking patterns and merge strategies',
            priority: 'high'
        });
    }

    return recommendations;
}

export default {
    monitorChunking,
    generateChunkingReport
};
