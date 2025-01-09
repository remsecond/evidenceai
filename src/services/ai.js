import { use_mcp_tool } from '../utils/mcp.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

export async function setupAI() {
    try {
        logger.info('AI service initialized');
        return true;
    } catch (error) {
        logger.error('Failed to initialize AI service', { error });
        throw new Error('Failed to initialize AI service');
    }
}

// Maximum tokens per chunk (leaving room for output)
const MAX_CHUNK_SIZE = 150000; // 150k tokens for input to leave 50k for output

/**
 * Split text into chunks that respect token limits
 */
function chunkText(text, maxSize = MAX_CHUNK_SIZE) {
    // Estimate tokens (rough approximation: 4 chars = 1 token)
    const estimatedTokens = text.length / 4;
    console.log(`[DEBUG] Chunking text: ${text.length} chars, ≈${Math.ceil(estimatedTokens)} tokens`);
    
    if (estimatedTokens <= maxSize) {
        console.log('[DEBUG] Text fits in single chunk');
        return [text];
    }

    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    console.log(`[DEBUG] Split into ${paragraphs.length} paragraphs`);
    const chunks = [];
    let currentChunk = '';
    let currentSize = 0;

    for (const paragraph of paragraphs) {
        const paragraphTokens = paragraph.length / 4;
        
        if (currentSize + paragraphTokens > maxSize) {
            if (currentChunk) {
                console.log(`[DEBUG] Chunk complete: ≈${Math.ceil(currentSize)} tokens`);
                chunks.push(currentChunk);
                currentChunk = paragraph;
                currentSize = paragraphTokens;
            } else {
                // Single paragraph is too large, force split
                console.log(`[DEBUG] Large paragraph found: ≈${Math.ceil(paragraphTokens)} tokens`);
                const forcedChunks = splitLongParagraph(paragraph, maxSize);
                console.log(`[DEBUG] Force split into ${forcedChunks.length} sub-chunks`);
                chunks.push(...forcedChunks);
            }
        } else {
            currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
            currentSize += paragraphTokens;
        }
    }

    if (currentChunk) {
        console.log(`[DEBUG] Final chunk: ≈${Math.ceil(currentSize)} tokens`);
        chunks.push(currentChunk);
    }

    console.log(`[DEBUG] Created ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
        console.log(`[DEBUG] Chunk ${i + 1}: ≈${Math.ceil(chunk.length / 4)} tokens`);
    });

    return chunks;
}

/**
 * Split a single long paragraph into smaller chunks
 */
function splitLongParagraph(paragraph, maxSize) {
    const chunks = [];
    const estimatedChunkLength = (maxSize * 4) - 100; // Convert tokens to chars, leave some buffer
    
    for (let i = 0; i < paragraph.length; i += estimatedChunkLength) {
        chunks.push(paragraph.slice(i, i + estimatedChunkLength));
    }
    
    return chunks;
}

/**
 * Analyze text using AI models
 */
export async function analyzeText(text, options = {}) {
    try {
        console.log('[INFO] Starting AI text analysis');

        // Split text into chunks if needed
        const chunks = text.length > MAX_CHUNK_SIZE ? chunkText(text) : [text];
        console.log(`[INFO] Processing ${chunks.length} chunks`);

        // First pass: Basic preprocessing
        const structuredData = await Promise.all(chunks.map(async chunk => {
            const result = await use_mcp_tool({
                server_name: 'chatsum',
                tool_name: 'analyze',
                arguments: { 
                    text: chunk,
                    mode: 'structure' // Just extract structure and key points
                }
            });
            return result;
        }));

        // Combine chunk results
        const combinedData = structuredData.reduce((acc, curr) => ({
            content: acc.content.concat(curr.content || []),
            key_points: acc.key_points.concat(curr.key_points || []),
            dates: acc.dates.concat(curr.dates || []),
            entities: acc.entities.concat(curr.entities || [])
        }), { content: [], key_points: [], dates: [], entities: [] });

        // Second pass: Focused analysis on structured data
        const analysis = await use_mcp_tool({
            server_name: 'deepseek',
            tool_name: 'analyze_structured',
            arguments: {
                data: combinedData,
                focus: options.focus || 'general'
            }
        });

        return {
            structured_data: combinedData,
            analysis: analysis,
            metadata: {
                chunks: chunks.length,
                processing_time: Date.now()
            }
        };

    } catch (error) {
        console.error('[ERROR] Error in AI analysis:', error);
        throw error;
    }
}

/**
 * Merge results from multiple chunks
 */
function mergeChunkResults(chunkResults) {
    return {
        semantic: {
            key_points: chunkResults.flatMap(r => r.semantic.key_points),
            summary: chunkResults.map(r => r.semantic.summary).join(' '),
            initial_patterns: Array.from(new Set(chunkResults.flatMap(r => r.semantic.initial_patterns))),
            confidence: chunkResults.reduce((acc, r) => acc + r.semantic.confidence, 0) / chunkResults.length
        },
        validation: {
            valid_topics: Array.from(new Set(chunkResults.flatMap(r => r.validation.valid_topics))),
            valid_entities: Array.from(new Set(chunkResults.flatMap(r => r.validation.valid_entities))),
            valid_relationships: chunkResults.flatMap(r => r.validation.valid_relationships),
            valid_patterns: Array.from(new Set(chunkResults.flatMap(r => r.validation.valid_patterns))),
            confidence_scores: {
                topics: average(chunkResults.map(r => r.validation.confidence_scores.topics)),
                entities: average(chunkResults.map(r => r.validation.confidence_scores.entities)),
                relationships: average(chunkResults.map(r => r.validation.confidence_scores.relationships)),
                patterns: average(chunkResults.map(r => r.validation.confidence_scores.patterns))
            }
        },
        entities: {
            entities: mergeEntities(chunkResults.map(r => r.entities.entities)),
            relationships: mergeRelationships(chunkResults.map(r => r.entities.relationships)),
            cross_references: chunkResults.flatMap(r => r.entities.cross_references),
            metadata: {
                ...chunkResults[0].entities.metadata,
                processing_time: chunkResults.reduce((acc, r) => acc + r.entities.metadata.processing_time, 0),
                confidence_scores: {
                    entity_extraction: average(chunkResults.map(r => r.entities.metadata.confidence_scores.entity_extraction)),
                    relationship_detection: average(chunkResults.map(r => r.entities.metadata.confidence_scores.relationship_detection)),
                    cross_reference_resolution: average(chunkResults.map(r => r.entities.metadata.confidence_scores.cross_reference_resolution))
                }
            }
        },
        timeline: {
            events: chunkResults.flatMap(r => r.timeline.events || []).sort((a, b) => {
                return new Date(a.timestamp) - new Date(b.timestamp);
            }),
            metadata: {
                total_events: chunkResults.reduce((acc, r) => acc + (r.timeline.events?.length || 0), 0),
                confidence: average(chunkResults.map(r => r.timeline.metadata?.confidence || 0))
            }
        },
        complex: {
            patterns: Array.from(new Set(chunkResults.flatMap(r => r.complex.patterns || []))),
            tone: {
                overall: chunkResults.reduce((acc, r) => {
                    if (!r.complex.tone?.overall) return acc;
                    return {
                        sentiment: r.complex.tone.overall.sentiment,
                        intensity: (acc?.intensity || 0) + r.complex.tone.overall.intensity
                    };
                }, null),
                segments: chunkResults.flatMap(r => r.complex.tone?.segments || []).sort((a, b) => {
                    return new Date(a.timestamp) - new Date(b.timestamp);
                })
            },
            metadata: {
                confidence: average(chunkResults.map(r => r.complex.metadata?.confidence || 0)),
                pattern_count: chunkResults.reduce((acc, r) => acc + (r.complex.patterns?.length || 0), 0)
            }
        }
    };
}

/**
 * Merge entity lists while combining duplicate entities
 */
function mergeEntities(entityLists) {
    const merged = {
        people: [],
        organizations: [],
        dates: []
    };

    for (const type of Object.keys(merged)) {
        const entities = entityLists.flatMap(list => list[type] || []);
        const entityMap = new Map();

        for (const entity of entities) {
            const existing = entityMap.get(entity.name);
            if (existing) {
                existing.attributes.mentions += entity.attributes.mentions;
                existing.confidence = (existing.confidence + entity.confidence) / 2;
            } else {
                entityMap.set(entity.name, { ...entity });
            }
        }

        merged[type] = Array.from(entityMap.values());
    }

    return merged;
}

/**
 * Merge relationship lists while removing duplicates
 */
function mergeRelationships(relationshipLists) {
    const relationships = relationshipLists.flat();
    const seen = new Set();
    return relationships.filter(rel => {
        const key = `${rel.from}-${rel.to}-${rel.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Calculate average of numbers
 */
function average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Analyze complex patterns in text
 */
export async function analyzeComplex(text, context = {}) {
    try {
        logger.info('Starting complex pattern analysis');
        
        // Extract timeline events first for context
        const timelineAnalysis = await use_mcp_tool({
            server_name: 'sequential-thinking',
            tool_name: 'extract_timeline',
            arguments: { text }
        });

        // Analyze complex patterns with timeline context
        const complexAnalysis = await use_mcp_tool({
            server_name: 'deepseek',
            tool_name: 'analyze_patterns',
            arguments: { 
                text,
                context: {
                    ...context,
                    timeline: timelineAnalysis
                }
            }
        });

        return {
            patterns: complexAnalysis.patterns || [],
            tone: complexAnalysis.tone || {
                overall: { sentiment: 'neutral', intensity: 0 },
                segments: []
            },
            metadata: {
                confidence: complexAnalysis.metadata?.confidence || 0,
                pattern_count: complexAnalysis.patterns?.length || 0
            }
        };
    } catch (error) {
        logger.error('Error in complex analysis:', error);
        throw error;
    }
}

/**
 * Analyze semantic aspects of text
 */
export async function analyzeSemantic(text, options = {}) {
    try {
        logger.info('Starting semantic analysis');

        // Extract key information using MCP tools
        const semanticAnalysis = await use_mcp_tool({
            server_name: 'chatsum',
            tool_name: 'analyze',
            arguments: { text }
        });

        // Validate analysis with sequential thinking
        const validationResult = await use_mcp_tool({
            server_name: 'sequential-thinking',
            tool_name: 'validate_analysis',
            arguments: {
                analysis: semanticAnalysis,
                context: options
            }
        });

        return {
            key_points: semanticAnalysis.key_points,
            summary: semanticAnalysis.summary,
            initial_patterns: semanticAnalysis.initial_patterns,
            confidence: semanticAnalysis.confidence,
            validation: {
                valid_topics: validationResult.valid_topics,
                valid_patterns: validationResult.valid_patterns,
                confidence_scores: validationResult.confidence_scores
            }
        };
    } catch (error) {
        logger.error('Error in semantic analysis:', error);
        throw error;
    }
}

/**
 * Analyze document with comprehensive analysis
 */
export async function analyzeDocument(text, options = {}) {
    try {
        logger.info('Starting document analysis');

        // Run semantic analysis first
        const semanticResult = await analyzeSemantic(text, options);

        // Extract entities and relationships
        const entityAnalysis = await use_mcp_tool({
            server_name: 'deepseek',
            tool_name: 'extract_entities',
            arguments: { text }
        });

        // Extract timeline events
        const timelineAnalysis = await use_mcp_tool({
            server_name: 'sequential-thinking',
            tool_name: 'extract_timeline',
            arguments: { text }
        });

        // Run complex pattern analysis
        const complexResult = await analyzeComplex(text, {
            ...options,
            semantic: semanticResult,
            timeline: timelineAnalysis
        });

        return {
            semantic: semanticResult,
            entities: entityAnalysis,
            timeline: timelineAnalysis,
            complex: complexResult,
            metadata: {
                processing_time: Date.now(),
                confidence_scores: {
                    semantic: semanticResult.confidence,
                    entities: entityAnalysis.metadata.confidence_scores.entity_extraction,
                    timeline: timelineAnalysis.metadata.confidence,
                    complex: complexResult.metadata.confidence
                }
            }
        };
    } catch (error) {
        logger.error('Error in document analysis:', error);
        throw error;
    }
}

/**
 * Analyze timeline events in text
 */
export async function analyzeTimeline(text, options = {}) {
    try {
        logger.info('Starting timeline analysis');

        // Extract timeline events
        const timelineAnalysis = await use_mcp_tool({
            server_name: 'sequential-thinking',
            tool_name: 'extract_timeline',
            arguments: { text }
        });

        // Validate and enrich timeline
        const validationResult = await use_mcp_tool({
            server_name: 'sequential-thinking',
            tool_name: 'validate_analysis',
            arguments: {
                analysis: timelineAnalysis,
                context: options
            }
        });

        return {
            events: timelineAnalysis.events || [],
            metadata: {
                total_events: timelineAnalysis.events?.length || 0,
                confidence: timelineAnalysis.metadata?.confidence || 0,
                validation: validationResult
            }
        };
    } catch (error) {
        logger.error('Error in timeline analysis:', error);
        throw error;
    }
}

/**
 * Generate text based on input and context
 */
export async function generateText(input, options = {}) {
    try {
        logger.info('Starting text generation');

        // Generate text using deepseek
        const generationResult = await use_mcp_tool({
            server_name: 'deepseek',
            tool_name: 'generate_text',
            arguments: { 
                input,
                ...options
            }
        });

        // Validate generated text
        const validationResult = await use_mcp_tool({
            server_name: 'sequential-thinking',
            tool_name: 'validate_analysis',
            arguments: {
                analysis: {
                    text: generationResult.text,
                    metadata: generationResult.metadata
                },
                context: options
            }
        });

        return {
            text: generationResult.text,
            metadata: {
                ...generationResult.metadata,
                validation: validationResult
            }
        };
    } catch (error) {
        logger.error('Error in text generation:', error);
        throw error;
    }
}

/**
 * Extract deep entities from text
 */
export async function extractDeepEntities(text, options = {}) {
    try {
        logger.info('Starting deep entity extraction');

        const entityAnalysis = await use_mcp_tool({
            server_name: 'deepseek',
            tool_name: 'extract_entities',
            arguments: { 
                text,
                ...options
            }
        });

        return {
            entities: entityAnalysis.entities || {},
            relationships: entityAnalysis.relationships || [],
            cross_references: entityAnalysis.cross_references || [],
            metadata: entityAnalysis.metadata || {
                confidence_scores: {
                    entity_extraction: 0,
                    relationship_detection: 0,
                    cross_reference_resolution: 0
                }
            }
        };
    } catch (error) {
        logger.error('Error in deep entity extraction:', error);
        throw error;
    }
}

/**
 * Summarize text content
 */
export async function summarizeText(text, options = {}) {
    try {
        logger.info('Starting text summarization');

        const summaryResult = await use_mcp_tool({
            server_name: 'chatsum',
            tool_name: 'summarize',
            arguments: { 
                text,
                ...options
            }
        });

        return {
            summary: summaryResult.summary,
            length: summaryResult.length,
            sentence_count: summaryResult.sentence_count,
            confidence: summaryResult.confidence
        };
    } catch (error) {
        logger.error('Error in text summarization:', error);
        throw error;
    }
}

export default {
    analyzeText,
    setupAI,
    analyzeComplex,
    analyzeSemantic,
    analyzeDocument,
    analyzeTimeline,
    generateText,
    extractDeepEntities,
    summarizeText
};
