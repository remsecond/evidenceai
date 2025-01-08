import { analyzeText } from './ai.js';
import { processEmail } from './email-processing.js';
import { checkFileSize, formatSizeCheckResult } from '../utils/file-size-checker.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

/**
 * Process OFW (Our Family Wizard) document
 */
export async function processOFW(content, analysis) {
    try {
        logger.info('Processing OFW document');

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

        // First process as regular email with size info
        const emailResult = await processEmail(content, {
            ...analysis,
            sizeCheck // Pass size check to avoid recalculating
        });
        logger.debug('Base email analysis:', emailResult);

        // Track OFW-specific size metrics
        const ofwSizeMetrics = {
            ...sizeCheck.metrics,
            sections: countOFWSections(content),
            avg_section_size: Math.ceil(sizeCheck.estimatedTokens / countOFWSections(content))
        };

        // Perform OFW-specific analysis with chunking and size info
        const ofwResult = await analyzeText(content, {
            type: 'ofw',
            format: analysis.format,
            structure: analysis.structure,
            metadata: analysis.metadata,
            base_analysis: emailResult, // Pass email analysis for context
            expectedChunks: sizeCheck.estimatedChunks,
            sizeAnalysis: sizeCheck
        });

        // Extract OFW-specific information
        const ofwAnalysis = {
            custody_events: extractCustodyEvents(emailResult, ofwResult),
            schedule_changes: extractScheduleChanges(emailResult, ofwResult),
            communication_patterns: analyzeCommunicationPatterns(emailResult, ofwResult)
        };
        logger.debug('OFW-specific analysis:', ofwAnalysis);

        // Track chunking metadata with size info
        const chunkingMeta = {
            enabled: true,
            email_chunks: emailResult.metadata?.chunking?.chunk_count || 1,
            ofw_chunks: ofwResult.metadata?.chunk_count || 1,
            total_chunks: (emailResult.metadata?.chunking?.chunk_count || 1) + 
                         (ofwResult.metadata?.chunk_count || 1),
            size_analysis: {
                total_size_mb: sizeCheck.sizeMB,
                estimated_tokens: sizeCheck.estimatedTokens,
                processing_category: sizeCheck.category,
                estimated_time: sizeCheck.metrics.estimatedProcessingTime,
                ofw_specific: ofwSizeMetrics
            }
        };

        // Combine results with chunking metadata
        return {
            ...emailResult,
            ofw: ofwAnalysis,
            metadata: {
                ...emailResult.metadata,
                chunking: chunkingMeta
            }
        };

    } catch (error) {
        logger.error('Error processing OFW document:', error);
        throw error;
    }
}

/**
 * Count OFW sections in content
 */
function countOFWSections(content) {
    // Count sections separated by ===
    const sections = content.split(/={3,}\s*\n/).length;
    return Math.max(1, sections); // At least 1 section
}

/**
 * Extract custody-related events from analysis
 */
function extractCustodyEvents(emailResult, ofwResult) {
    try {
        const events = [];

        // Extract from timeline
        if (emailResult.analysis.timeline) {
            emailResult.analysis.timeline.forEach(item => {
                if (item.event.toLowerCase().includes('pickup') ||
                    item.event.toLowerCase().includes('exchange') ||
                    item.event.toLowerCase().includes('visit')) {
                    events.push({
                        type: 'custody_event',
                        date: item.date,
                        description: item.event,
                        confidence: item.confidence
                    });
                }
            });
        }

        // Extract from semantic analysis
        if (emailResult.analysis.semantic && emailResult.analysis.semantic.key_points) {
            emailResult.analysis.semantic.key_points.forEach(point => {
                if (point.context === 'custody_arrangement' || 
                    point.text.toLowerCase().includes('pickup') ||
                    point.text.toLowerCase().includes('exchange')) {
                    events.push({
                        type: 'custody_arrangement',
                        description: point.text,
                        importance: point.importance,
                        confidence: 0.8
                    });
                }
            });
        }

        return events;
    } catch (error) {
        logger.error('Error extracting custody events:', error);
        return [];
    }
}

/**
 * Extract schedule changes from analysis
 */
function extractScheduleChanges(emailResult, ofwResult) {
    try {
        const changes = [];

        // Extract from semantic analysis
        if (emailResult.analysis.semantic && emailResult.analysis.semantic.key_points) {
            emailResult.analysis.semantic.key_points.forEach(point => {
                if (point.text.toLowerCase().includes('change') ||
                    point.text.toLowerCase().includes('reschedule') ||
                    point.text.toLowerCase().includes('instead of')) {
                    changes.push({
                        description: point.text,
                        importance: point.importance,
                        context: point.context,
                        confidence: 0.8
                    });
                }
            });
        }

        // Extract from entity relationships
        if (emailResult.analysis.entities && emailResult.analysis.entities.relationships) {
            emailResult.analysis.entities.relationships.forEach(rel => {
                if (rel.type === 'schedule_change' || rel.type === 'time_modification') {
                    changes.push({
                        from: rel.from,
                        to: rel.to,
                        type: rel.type,
                        confidence: rel.confidence
                    });
                }
            });
        }

        return changes;
    } catch (error) {
        logger.error('Error extracting schedule changes:', error);
        return [];
    }
}

/**
 * Analyze communication patterns
 */
function analyzeCommunicationPatterns(emailResult, ofwResult) {
    try {
        const patterns = {
            tone: analyzeTone(emailResult),
            formality: analyzeFormality(emailResult),
            responsiveness: analyzeResponsiveness(emailResult)
        };

        return patterns;
    } catch (error) {
        logger.error('Error analyzing communication patterns:', error);
        return {};
    }
}

/**
 * Analyze communication tone
 */
function analyzeTone(emailResult) {
    try {
        // Default neutral tone
        let tone = {
            primary: 'neutral',
            confidence: 0.6
        };

        // Check semantic analysis for emotional indicators
        if (emailResult.analysis.semantic && emailResult.analysis.semantic.key_points) {
            const emotionalWords = {
                positive: ['thank', 'appreciate', 'agree', 'well', 'good'],
                negative: ['concern', 'issue', 'problem', 'disagree', 'unfortunately'],
                urgent: ['urgent', 'immediate', 'asap', 'important']
            };

            let scores = { positive: 0, negative: 0, urgent: 0 };

            emailResult.analysis.semantic.key_points.forEach(point => {
                const text = point.text.toLowerCase();
                Object.entries(emotionalWords).forEach(([type, words]) => {
                    if (words.some(word => text.includes(word))) {
                        scores[type] += point.importance;
                    }
                });
            });

            // Determine primary tone
            const maxScore = Math.max(...Object.values(scores));
            const primaryTone = Object.entries(scores)
                .find(([_, score]) => score === maxScore)?.[0] || 'neutral';

            tone = {
                primary: primaryTone,
                confidence: maxScore > 0 ? 0.8 : 0.6
            };
        }

        return tone;
    } catch (error) {
        logger.error('Error analyzing tone:', error);
        return { primary: 'neutral', confidence: 0.5 };
    }
}

/**
 * Analyze communication formality
 */
function analyzeFormality(emailResult) {
    try {
        // Default moderate formality
        let formality = {
            level: 'moderate',
            confidence: 0.6
        };

        if (emailResult.analysis.semantic) {
            const formalIndicators = [
                'pursuant to',
                'regarding',
                'furthermore',
                'additionally',
                'therefore'
            ];

            const informalIndicators = [
                'hey',
                'thanks',
                'ok',
                'yeah',
                'btw'
            ];

            let formalCount = 0;
            let informalCount = 0;

            const text = JSON.stringify(emailResult.analysis.semantic).toLowerCase();

            formalIndicators.forEach(word => {
                if (text.includes(word)) formalCount++;
            });

            informalIndicators.forEach(word => {
                if (text.includes(word)) informalCount++;
            });

            if (formalCount > informalCount) {
                formality = { level: 'formal', confidence: 0.8 };
            } else if (informalCount > formalCount) {
                formality = { level: 'informal', confidence: 0.8 };
            }
        }

        return formality;
    } catch (error) {
        logger.error('Error analyzing formality:', error);
        return { level: 'moderate', confidence: 0.5 };
    }
}

/**
 * Analyze communication responsiveness
 */
function analyzeResponsiveness(emailResult) {
    try {
        // Default moderate responsiveness
        let responsiveness = {
            level: 'moderate',
            confidence: 0.6
        };

        if (emailResult.analysis.semantic) {
            const urgentIndicators = [
                'urgent',
                'asap',
                'immediate',
                'promptly',
                'quickly'
            ];

            const delayIndicators = [
                'when possible',
                'at your convenience',
                'no rush',
                'eventually'
            ];

            let urgentCount = 0;
            let delayCount = 0;

            const text = JSON.stringify(emailResult.analysis.semantic).toLowerCase();

            urgentIndicators.forEach(word => {
                if (text.includes(word)) urgentCount++;
            });

            delayIndicators.forEach(word => {
                if (text.includes(word)) delayCount++;
            });

            if (urgentCount > delayCount) {
                responsiveness = { level: 'urgent', confidence: 0.8 };
            } else if (delayCount > urgentCount) {
                responsiveness = { level: 'relaxed', confidence: 0.8 };
            }
        }

        return responsiveness;
    } catch (error) {
        logger.error('Error analyzing responsiveness:', error);
        return { level: 'moderate', confidence: 0.5 };
    }
}

export default {
    processOFW
};
