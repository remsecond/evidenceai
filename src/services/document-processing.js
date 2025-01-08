import { analyzeDocument } from './document-analyzer.js';
import { analyzeText } from './ai.js';
import { analyzeOutliers } from './outlier-analysis.js';
import { checkFileSize, formatSizeCheckResult } from '../utils/file-size-checker.js';
import { validateFile, formatValidationResult } from '../utils/file-validator.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

/**
 * Process document with comprehensive analysis
 */
export async function processDocument(content, filename = '') {
    try {
        logger.info('Starting document processing:', filename);

        // Validate file before processing
        const validation = await validateFile(content, {
            type: filename.endsWith('.eml') ? 'email' : undefined
        });
        logger.info('File validation results:', formatValidationResult(validation));

        // If validation fails, fail early with clear message
        if (!validation.canProcess) {
            throw new Error(formatValidationResult(validation));
        }

        // Add validation warnings to logs
        validation.warnings.forEach(warning => {
            logger.warn('File validation warning:', warning);
        });

        // Extract size check from validation
        const sizeCheck = validation.size;

        // Analyze document structure and format
        const documentAnalysis = await analyzeDocument(content, filename);
        logger.debug('Document analysis:', documentAnalysis);

        // Perform AI analysis
        const aiAnalysis = await analyzeText(content, {
            format: documentAnalysis.format,
            structure: documentAnalysis.structure,
            expectedChunks: sizeCheck.estimatedChunks
        });
        logger.debug('AI analysis:', aiAnalysis);

        // Analyze outliers
        const outlierAnalysis = await analyzeOutliers(content, {
            format: documentAnalysis.format,
            structure: documentAnalysis.structure,
            semantic: aiAnalysis.semantic,
            expectedChunks: sizeCheck.estimatedChunks
        });
        logger.debug('Outlier analysis:', outlierAnalysis);

        // Track chunking metadata
        const chunkingMeta = {
            enabled: true,
            ai_chunks: aiAnalysis.metadata?.chunk_count || 1,
            outlier_chunks: outlierAnalysis.metadata?.chunking?.total_chunks || 1,
            total_chunks: (aiAnalysis.metadata?.chunk_count || 1) + 
                         (outlierAnalysis.metadata?.chunking?.total_chunks || 1),
            size_analysis: {
                total_size_mb: sizeCheck.sizeMB,
                estimated_tokens: sizeCheck.estimatedTokens,
                processing_category: sizeCheck.category,
                estimated_time: sizeCheck.metrics.estimatedProcessingTime
            }
        };

        // Combine results with chunking metadata
        const result = {
            success: true,
            format: documentAnalysis.format,
            structure: documentAnalysis.structure,
            metadata: {
                ...documentAnalysis.metadata,
                confidence_scores: {
                    document: documentAnalysis.metadata.confidence_scores,
                    semantic: aiAnalysis.semantic.confidence || 0.7,
                    outliers: outlierAnalysis.metadata.confidence_scores.overall
                },
                chunking: chunkingMeta,
                processing_stats: {
                    total_tokens_processed: sizeCheck.estimatedTokens,
                    chunks_processed: chunkingMeta.total_chunks,
                    avg_chunk_size: Math.ceil(sizeCheck.estimatedTokens / chunkingMeta.total_chunks),
                    processing_time: Date.now() - documentAnalysis.metadata.processing_time,
                    efficiency: calculateEfficiency(sizeCheck, chunkingMeta)
                },
                validation: {
                    encoding: validation.encoding.metrics,
                    quality: {
                        content_density: validation.quality?.contentDensity,
                        unique_lines: validation.quality?.uniqueLines,
                        format_compliance: validation.format?.valid
                    },
                    security: validation.security.valid
                }
            },
            analysis: {
                semantic: aiAnalysis.semantic,
                entities: aiAnalysis.entities,
                validation: aiAnalysis.validation,
                outliers: outlierAnalysis.outliers
            }
        };

        logger.info('Document processing complete', {
            size_mb: sizeCheck.sizeMB,
            chunks: chunkingMeta.total_chunks,
            processing_time: result.metadata.processing_stats.processing_time
        });

        return result;

    } catch (error) {
        logger.error('Error processing document:', error);
        throw error;
    }
}

/**
 * Calculate processing efficiency
 */
function calculateEfficiency(sizeCheck, chunkingMeta) {
    const idealChunks = sizeCheck.estimatedChunks;
    const actualChunks = chunkingMeta.total_chunks;
    const chunkEfficiency = idealChunks / actualChunks;

    return {
        chunk_efficiency: chunkEfficiency,
        parallel_efficiency: actualChunks > 1 ? 0.8 : 1.0, // Parallel processing overhead
        overall_efficiency: chunkEfficiency * (actualChunks > 1 ? 0.8 : 1.0)
    };
}

/**
 * Estimate token count (rough approximation: 4 chars = 1 token)
 */
function estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
}

export default {
    processDocument,
    estimateTokenCount
};
