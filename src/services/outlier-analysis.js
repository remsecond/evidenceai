import { analyzeText } from './ai.js';
import { use_mcp_tool } from '../utils/mcp.js';

/**
 * Analyze text for outliers and anomalies
 */
export async function analyzeOutliers(text, context = {}) {
    try {
        console.log('[INFO] Starting outlier analysis');
        const startTime = Date.now();

        // Use unified AI service with chunking
        const aiResult = await analyzeText(text, {
            type: 'outlier_analysis',
            ...context
        });
        console.log('[DEBUG] AI analysis complete');

        const structuredData = aiResult.structured_data;
        const analysis = aiResult.analysis;

        // Extract outliers
        const outliers = [];

        // Check for semantic outliers
        if (structuredData.key_points) {
            structuredData.key_points.forEach(point => {
                if (point.importance > 0.8) {
                    outliers.push({
                        type: 'semantic_importance',
                        text: point.text,
                        importance: point.importance,
                        context: point.context
                    });
                }
            });
        }

        // Check for pattern outliers
        if (analysis.patterns) {
            analysis.patterns.forEach(pattern => {
                if (pattern.confidence > 0.8) {
                    outliers.push({
                        type: 'pattern_significance',
                        pattern: pattern.type,
                        description: pattern.description,
                        confidence: pattern.confidence
                    });
                }
            });
        }

        // Check for validation outliers
        if (analysis.metadata?.validation?.patterns) {
            analysis.metadata.validation.patterns.forEach(pattern => {
                if (!analysis.patterns.some(p => p.type === pattern)) {
                    outliers.push({
                        type: 'pattern_mismatch',
                        pattern,
                        confidence: analysis.metadata.validation.confidence || 0.7
                    });
                }
            });
        }

        // Analyze temporal and communication patterns with chunking
        const patternResult = await analyzeText(text, {
            type: 'pattern_analysis',
            base_analysis: aiResult,
            ...context
        });

        // Extract temporal and communication outliers
        const temporalOutliers = extractTemporalOutliers(patternResult);
        const communicationOutliers = extractCommunicationOutliers(patternResult);
        outliers.push(...temporalOutliers, ...communicationOutliers);

        // Sort outliers by confidence/importance
        outliers.sort((a, b) => {
            const aScore = a.confidence || a.importance || 0;
            const bScore = b.confidence || b.importance || 0;
            return bScore - aScore;
        });

        console.log('[INFO] Outlier analysis complete');
        return {
            outliers,
            metadata: {
                total_outliers: outliers.length,
                confidence_scores: {
                    semantic: analysis.metadata?.confidence || 0.7,
                    patterns: analysis.metadata?.validation?.confidence || 0.7,
                    overall: calculateOverallConfidence(outliers)
                },
                chunking: {
                    enabled: true,
                    analysis_chunks: aiResult.metadata?.chunks || 1,
                    pattern_chunks: patternResult.metadata?.chunks || 1,
                    total_chunks: (aiResult.metadata?.chunks || 1) + 
                                (patternResult.metadata?.chunks || 1)
                },
                processing_stats: {
                    total_tokens_processed: aiResult.metadata?.total_tokens || 0,
                    avg_chunk_size: aiResult.metadata?.avg_chunk_size || 0,
                    processing_time: Date.now() - startTime
                }
            }
        };

    } catch (error) {
        console.error('[ERROR] Error in outlier analysis:', error);
        throw error;
    }
}

/**
 * Extract temporal outliers from pattern analysis
 */
function extractTemporalOutliers(patternResult) {
    const outliers = [];
    
    if (patternResult.entities?.dates) {
        // Sort dates chronologically
        const dates = patternResult.entities.dates
            .map(d => ({ ...d, timestamp: new Date(d.text).getTime() }))
            .sort((a, b) => a.timestamp - b.timestamp);

        // Check for unusual time gaps
        for (let i = 1; i < dates.length; i++) {
            const gap = dates[i].timestamp - dates[i-1].timestamp;
            const avgGap = (dates[dates.length-1].timestamp - dates[0].timestamp) / (dates.length - 1);
            
            if (Math.abs(gap - avgGap) > avgGap * 2) {
                outliers.push({
                    type: 'temporal_gap',
                    description: `Unusual time gap between ${dates[i-1].text} and ${dates[i].text}`,
                    confidence: 0.8,
                    metadata: {
                        gap_size: gap,
                        average_gap: avgGap
                    }
                });
            }
        }
    }

    return outliers;
}

/**
 * Extract communication outliers from pattern analysis
 */
function extractCommunicationOutliers(patternResult) {
    const outliers = [];

    if (patternResult.semantic?.sentiment) {
        const sentiment = patternResult.semantic.sentiment;
        
        // Check for strong sentiment
        if (Math.abs(sentiment.score) > 0.8) {
            outliers.push({
                type: 'strong_sentiment',
                sentiment: sentiment.label,
                confidence: Math.abs(sentiment.score),
                description: `Strong ${sentiment.label} sentiment detected`
            });
        }

        // Check for sentiment shifts
        if (sentiment.shifts) {
            sentiment.shifts.forEach(shift => {
                if (shift.magnitude > 0.5) {
                    outliers.push({
                        type: 'sentiment_shift',
                        description: `Significant sentiment shift: ${shift.from} to ${shift.to}`,
                        confidence: shift.magnitude,
                        metadata: shift
                    });
                }
            });
        }
    }

    return outliers;
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(outliers) {
    if (!outliers.length) return 0;

    const scores = outliers.map(o => o.confidence || o.importance || 0);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Weight by number of outliers (more outliers = higher confidence)
    const weightedScore = avgScore * Math.min(outliers.length / 5, 1);
    
    return Math.min(weightedScore, 1);
}

export default {
    analyzeOutliers
};
