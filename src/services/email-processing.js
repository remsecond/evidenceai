import { analyzeText } from './ai.js';
import { checkFileSize, formatSizeCheckResult } from '../utils/file-size-checker.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

/**
 * Process email document
 */
export async function processEmail(content, analysis) {
    try {
        logger.info('Processing email document');

        // Check file size before processing
        const sizeCheck = checkFileSize(content.length);
        logger.info('File size analysis:', formatSizeCheckResult(sizeCheck));

        // If file is too large, fail early with clear message
        if (!sizeCheck.canProcess) {
            throw new Error(formatSizeCheckResult(sizeCheck));
        }

        // Add size check warning to logs if needed
        if (sizeCheck.warning) {
            logger.warn(sizeCheck.warning);
        }

        // Use unified AI service with built-in chunking and size info
        const aiResult = await analyzeText(content, {
            type: 'email',
            format: analysis.format,
            structure: analysis.structure,
            metadata: analysis.metadata,
            expectedChunks: sizeCheck.estimatedChunks,
            sizeAnalysis: sizeCheck
        });

        // Combine all analysis results with size info
        const result = {
            success: true,
            format: analysis.format,
            structure: analysis.structure,
            metadata: {
                ...analysis.metadata,
                chunking: {
                    enabled: true,
                    chunk_count: aiResult.metadata?.chunk_count || 1,
                    size_analysis: {
                        total_size_mb: sizeCheck.sizeMB,
                        estimated_tokens: sizeCheck.estimatedTokens,
                        processing_category: sizeCheck.category,
                        estimated_time: sizeCheck.metrics.estimatedProcessingTime
                    }
                }
            },
            analysis: {
                semantic: aiResult.semantic,
                validation: aiResult.validation,
                entities: aiResult.entities,
                timeline: extractTimeline(aiResult.entities),
                complex: analyzeComplexPatterns(aiResult.semantic, aiResult.entities)
            }
        };

        console.log('[INFO] Email processing complete');
        return result;

    } catch (error) {
        console.error('[ERROR] Error processing email:', error);
        throw error;
    }
}

/**
 * Extract timeline from entity analysis
 */
function extractTimeline(entityAnalysis) {
    try {
        const timeline = [];

        // Extract dates and associated events
        if (entityAnalysis.entities && entityAnalysis.entities.dates) {
            entityAnalysis.entities.dates.forEach(date => {
                if (date.attributes && date.attributes.event) {
                    timeline.push({
                        date: date.text,
                        event: date.attributes.event,
                        confidence: date.confidence
                    });
                }
            });
        }

        // Sort timeline by date
        timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        return timeline;
    } catch (error) {
        console.error('[ERROR] Error extracting timeline:', error);
        return [];
    }
}

/**
 * Analyze complex patterns in the analysis results
 */
function analyzeComplexPatterns(semantic, entities) {
    try {
        const patterns = [];

        // Check for recurring themes
        if (semantic.key_points) {
            const themes = new Map();
            semantic.key_points.forEach(point => {
                if (point.context) {
                    themes.set(point.context, (themes.get(point.context) || 0) + 1);
                }
            });

            themes.forEach((count, theme) => {
                if (count > 1) {
                    patterns.push({
                        type: 'recurring_theme',
                        theme,
                        occurrences: count,
                        confidence: 0.8
                    });
                }
            });
        }

        // Check for relationship patterns
        if (entities.relationships) {
            const relationTypes = new Map();
            entities.relationships.forEach(rel => {
                relationTypes.set(rel.type, (relationTypes.get(rel.type) || 0) + 1);
            });

            relationTypes.forEach((count, type) => {
                if (count > 1) {
                    patterns.push({
                        type: 'relationship_pattern',
                        relationship: type,
                        occurrences: count,
                        confidence: 0.7
                    });
                }
            });
        }

        return patterns;
    } catch (error) {
        console.error('[ERROR] Error analyzing complex patterns:', error);
        return [];
    }
}

export default {
    processEmail
};
