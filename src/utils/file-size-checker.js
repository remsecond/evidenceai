import { getLogger } from './logging.js';

const logger = getLogger();

// Size constants in bytes
export const SIZE_LIMITS = {
    SINGLE_CHUNK: 0.6 * 1024 * 1024,    // 0.6MB
    SMALL_FILE: 2.4 * 1024 * 1024,      // 2.4MB
    MEDIUM_FILE: 9.6 * 1024 * 1024,     // 9.6MB
    LARGE_FILE: 30 * 1024 * 1024,       // 30MB
    MAX_SIZE: 30 * 1024 * 1024          // 30MB hard limit
};

// Processing categories
export const PROCESSING_CATEGORIES = {
    SINGLE_CHUNK: 'single_chunk',
    SMALL: 'small_multi_chunk',
    MEDIUM: 'medium_multi_chunk',
    LARGE: 'large_multi_chunk',
    TOO_LARGE: 'too_large'
};

/**
 * Check file size and provide processing guidance
 */
export function checkFileSize(sizeInBytes) {
    const sizeMB = sizeInBytes / (1024 * 1024);
    const estimatedTokens = Math.ceil(sizeInBytes / 4);
    const estimatedChunks = Math.ceil(sizeInBytes / SIZE_LIMITS.SINGLE_CHUNK);

    let category;
    let guidance;
    let warning;
    let error;

    if (sizeInBytes > SIZE_LIMITS.MAX_SIZE) {
        category = PROCESSING_CATEGORIES.TOO_LARGE;
        error = {
            code: 'FILE_TOO_LARGE',
            message: `File size (${sizeMB.toFixed(1)}MB) exceeds maximum limit of 30MB`,
            details: {
                size: sizeInBytes,
                maxSize: SIZE_LIMITS.MAX_SIZE,
                recommendation: 'Please split the file into smaller segments before processing'
            }
        };
    } else if (sizeInBytes > SIZE_LIMITS.MEDIUM_FILE) {
        category = PROCESSING_CATEGORIES.LARGE;
        warning = 'Processing may take significant time';
        guidance = 'File will be processed in multiple chunks with parallel processing where possible';
    } else if (sizeInBytes > SIZE_LIMITS.SMALL_FILE) {
        category = PROCESSING_CATEGORIES.MEDIUM;
        guidance = 'File will be processed in multiple chunks';
    } else if (sizeInBytes > SIZE_LIMITS.SINGLE_CHUNK) {
        category = PROCESSING_CATEGORIES.SMALL;
        guidance = 'File will be split into a few chunks';
    } else {
        category = PROCESSING_CATEGORIES.SINGLE_CHUNK;
        guidance = 'File can be processed in a single chunk';
    }

    const result = {
        sizeBytes: sizeInBytes,
        sizeMB: sizeMB,
        category,
        estimatedTokens,
        estimatedChunks,
        guidance,
        canProcess: !error,
        metrics: {
            tokensPerChunk: Math.ceil(estimatedTokens / estimatedChunks),
            estimatedProcessingTime: estimatedChunks * 5000 // 5 seconds per chunk
        }
    };

    if (warning) result.warning = warning;
    if (error) result.error = error;

    logger.debug('File size check result:', result);

    return result;
}

/**
 * Format size check result into user-friendly message
 */
export function formatSizeCheckResult(result) {
    const messages = [];

    // Add size information
    messages.push(`File Size: ${result.sizeMB.toFixed(1)}MB`);
    messages.push(`Estimated Tokens: ${result.estimatedTokens.toLocaleString()}`);

    // Add processing information
    if (result.canProcess) {
        messages.push(`Processing Type: ${formatCategory(result.category)}`);
        messages.push(`Estimated Chunks: ${result.estimatedChunks}`);
        messages.push(`Estimated Processing Time: ${formatTime(result.metrics.estimatedProcessingTime)}`);
        messages.push(`\nGuidance: ${result.guidance}`);
    }

    // Add warning if present
    if (result.warning) {
        messages.push(`\nWarning: ${result.warning}`);
    }

    // Add error if present
    if (result.error) {
        messages.push(`\nError: ${result.error.message}`);
        messages.push(`Recommendation: ${result.error.details.recommendation}`);
    }

    return messages.join('\n');
}

/**
 * Format processing category for display
 */
function formatCategory(category) {
    return category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Format time in milliseconds to human readable string
 */
function formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms/1000).toFixed(1)} seconds`;
    return `${Math.ceil(ms/60000)} minutes`;
}

/**
 * Example usage:
 * 
 * // Check file size before processing
 * const fileSize = fs.statSync(filePath).size;
 * const sizeCheck = checkFileSize(fileSize);
 * 
 * if (!sizeCheck.canProcess) {
 *     console.error(formatSizeCheckResult(sizeCheck));
 *     return;
 * }
 * 
 * // Show processing information
 * console.log(formatSizeCheckResult(sizeCheck));
 * 
 * // Proceed with processing if user accepts
 * const result = await processDocument(content);
 */
