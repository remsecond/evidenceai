import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../utils/logging.js';
import { parseEmailThread } from './email-processing.js';
import { processDocument } from './document-processing.js';
import { trackProcessingTime, trackError } from './monitoring.js';
import { analyzeDocument } from './ai.js';

const logger = getLogger();

// Supported file types and their processors
const FILE_TYPES = {
    // Email formats
    '.eml': 'email',
    '.msg': 'email',
    '.pdf': 'document',
    '.docx': 'document',
    '.txt': 'message',
    '.json': 'metadata'
};

// Input validation rules
const VALIDATION_RULES = {
    email: {
        requiredFields: ['from', 'to', 'subject', 'date'],
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['.eml', '.msg', '.pdf']
    },
    document: {
        maxSize: 20 * 1024 * 1024, // 20MB
        allowedTypes: ['.pdf', '.docx']
    },
    message: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['.txt', '.json']
    }
};

/**
 * Process input directory and prepare files for analysis
 */
export async function processInputDirectory(inputDir, options = {}) {
    const startTime = Date.now();
    const results = {
        processed: [],
        failed: [],
        skipped: [],
        metadata: null
    };

    try {
        logger.info(`Processing input directory: ${inputDir}`);

        // Create processing directories
        await createProcessingDirectories();

        // Process metadata first if exists
        const metadataFile = path.join(inputDir, 'metadata', 'labels.json');
        try {
            const metadataContent = await fs.readFile(metadataFile, 'utf8');
            results.metadata = JSON.parse(metadataContent);
            logger.info('Loaded metadata file');
        } catch (error) {
            logger.warn('No metadata file found or invalid format');
        }

        // Process all files recursively
        await processDirectory(inputDir, results, options);

        // Track processing time
        trackProcessingTime('input_processing', Date.now() - startTime);

        // Generate processing report
        const report = generateProcessingReport(results);
        await saveProcessingReport(report);

        return results;
    } catch (error) {
        trackError('input_processing', error);
        logger.error('Error processing input directory', { error });
        throw error;
    }
}

/**
 * Process a single file
 */
export async function processFile(filePath, metadata = {}, options = {}) {
    const startTime = Date.now();
    try {
        logger.info(`Processing file: ${filePath}`);

        // Validate file
        const fileType = await validateFile(filePath);
        if (!fileType) {
            return { status: 'skipped', reason: 'unsupported_type' };
        }

        // Enhance metadata with original path
        metadata = {
            ...metadata,
            originalPath: filePath
        };

        // Read file content
        const content = await fs.readFile(filePath);

        // Process based on type
        const result = await processContent(content, fileType, metadata, options);

        // Track processing time
        trackProcessingTime(`file_processing_${fileType}`, Date.now() - startTime);

        return {
            status: 'processed',
            type: fileType,
            result
        };
    } catch (error) {
        trackError('file_processing', error);
        logger.error(`Error processing file: ${filePath}`, { error });
        return {
            status: 'failed',
            error: error.message
        };
    }
}

/**
 * Process directory recursively
 */
async function processDirectory(dir, results, options) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip metadata directory
            if (entry.name === 'metadata') continue;
            await processDirectory(fullPath, results, options);
        } else {
            // Process file
            const metadata = getFileMetadata(fullPath, results.metadata);
            const result = await processFile(fullPath, metadata, options);

            switch (result.status) {
                case 'processed':
                    results.processed.push({ path: fullPath, ...result });
                    break;
                case 'failed':
                    results.failed.push({ path: fullPath, error: result.error });
                    break;
                case 'skipped':
                    results.skipped.push({ path: fullPath, reason: result.reason });
                    break;
            }
        }
    }
}

/**
 * Validate file before processing
 */
async function validateFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileType = FILE_TYPES[ext];

    if (!fileType) {
        logger.warn(`Unsupported file type: ${ext}`);
        return null;
    }

    const stats = await fs.stat(filePath);
    const rules = VALIDATION_RULES[fileType];

    if (stats.size > rules.maxSize) {
        throw new Error(`File exceeds maximum size: ${filePath}`);
    }

    if (!rules.allowedTypes.includes(ext)) {
        throw new Error(`Invalid file type for ${fileType}: ${ext}`);
    }

    return fileType;
}

/**
 * Process content based on type
 */
async function processContent(content, type, metadata, options) {
    const startTime = Date.now();
    try {
        switch (type) {
            case 'email':
                return parseEmailThread(content.toString());
            
            case 'document':
                const ext = path.extname(metadata.originalPath || '').toLowerCase();
                const docType = ext === '.pdf' ? 'pdf' : 'docx';
                
                const docResult = await processDocument(
                    metadata.originalPath,
                    docType,
                    {
                        renderPages: true,
                        extractMetadata: true,
                        ...options
                    }
                );

                // Enhance with AI analysis if enabled
                if (options.enhanceWithAI) {
                    const aiAnalysis = await analyzeDocument(docResult.text, docType);
                    docResult.analysis = aiAnalysis;
                }

                return docResult;
            
            case 'message':
                const messageContent = content.toString();
                return {
                    text: messageContent,
                    metadata: {
                        timestamp: metadata.timestamp || new Date().toISOString(),
                        source: metadata.source || 'unknown'
                    },
                    structure: {
                        type: 'message',
                        length: messageContent.length,
                        lines: messageContent.split('\n').length
                    }
                };
            
            default:
                throw new Error(`Unknown content type: ${type}`);
        }
    } finally {
        trackProcessingTime(`content_processing_${type}`, Date.now() - startTime);
    }
}

/**
 * Get metadata for file if available
 */
function getFileMetadata(filePath, metadata) {
    if (!metadata) return {};

    const relativePath = path.relative(process.cwd(), filePath);
    return metadata[relativePath] || {};
}

/**
 * Create necessary processing directories
 */
async function createProcessingDirectories() {
    const dirs = [
        'storage/staging/processed',
        'storage/staging/failed',
        'storage/staging/reports'
    ];

    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

/**
 * Generate processing report
 */
function generateProcessingReport(results) {
    return {
        timestamp: new Date().toISOString(),
        summary: {
            total: results.processed.length + results.failed.length + results.skipped.length,
            processed: results.processed.length,
            failed: results.failed.length,
            skipped: results.skipped.length
        },
        details: {
            processed: results.processed,
            failed: results.failed,
            skipped: results.skipped
        }
    };
}

/**
 * Save processing report
 */
async function saveProcessingReport(report) {
    const reportPath = path.join(
        'storage/staging/reports',
        `processing-report-${Date.now()}.json`
    );

    await fs.writeFile(
        reportPath,
        JSON.stringify(report, null, 2)
    );

    logger.info(`Processing report saved: ${reportPath}`);
}
