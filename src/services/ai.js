import { use_mcp_tool } from '../utils/mcp.js';

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

        // Split text into chunks
        const chunks = chunkText(text);
        console.log(`[INFO] Split text into ${chunks.length} chunks`);

        // Process each chunk
        const chunkResults = await Promise.all(chunks.map(async (chunk, index) => {
            console.log(`[INFO] Processing chunk ${index + 1}/${chunks.length}`);
            
            // Extract key information using MCP tools
            const semanticAnalysis = await use_mcp_tool({
                server_name: 'chatsum',
                tool_name: 'analyze',
                arguments: { text: chunk }
            });
        console.log('[DEBUG] Semantic analysis:', semanticAnalysis);

            // Validate analysis with sequential thinking
            const validationResult = await use_mcp_tool({
                server_name: 'sequential-thinking',
                tool_name: 'validate_analysis',
                arguments: {
                    analysis: semanticAnalysis,
                    context: { ...options, chunk_index: index }
                }
            });
        console.log('[DEBUG] Validation result:', validationResult);

            // Extract entities and relationships
            const entityAnalysis = await use_mcp_tool({
                server_name: 'deepseek',
                tool_name: 'extract_entities',
                arguments: { text: chunk }
            });
        console.log('[DEBUG] Entity analysis:', entityAnalysis);

            return {
                semantic: semanticAnalysis,
                validation: validationResult,
                entities: entityAnalysis
            };
        }));

        // Merge results from all chunks
        const result = mergeChunkResults(chunkResults);

        console.log('[INFO] AI analysis complete');
        return result;

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
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Generate text using AI models
 */
export async function generateText(prompt, options = {}) {
    try {
        console.log('[INFO] Starting AI text generation');

        // Check if prompt needs chunking
        const chunks = chunkText(prompt);
        console.log(`[INFO] Split prompt into ${chunks.length} chunks`);

        if (chunks.length === 1) {
            // Single chunk, process directly
            const modelName = options.model || 'gpt4';
            const result = await use_mcp_tool({
                server_name: modelName,
                tool_name: 'generate',
                arguments: {
                    prompt: chunks[0],
                    ...options
                }
            });

            console.log('[INFO] Text generation complete');
            return result;
        }

        // For multiple chunks, we need to handle them sequentially
        // and maintain context between generations
        const modelName = options.model || 'gpt4';
        let context = '';
        let finalResult = '';

        for (let i = 0; i < chunks.length; i++) {
            console.log(`[INFO] Processing chunk ${i + 1}/${chunks.length}`);
            
            const result = await use_mcp_tool({
                server_name: modelName,
                tool_name: 'generate',
                arguments: {
                    prompt: chunks[i],
                    context,
                    ...options,
                    is_chunk: true,
                    chunk_index: i,
                    total_chunks: chunks.length
                }
            });

            // Update context for next chunk
            context = result.text;
            finalResult += result.text;
        }

        // Generate final completion to ensure coherence
        const finalCompletion = await use_mcp_tool({
            server_name: modelName,
            tool_name: 'generate',
            arguments: {
                prompt: finalResult,
                ...options,
                is_final: true
            }
        });

        console.log('[INFO] Text generation complete');
        return {
            text: finalCompletion.text,
            tokens: finalCompletion.tokens,
            model: finalCompletion.model,
            chunk_count: chunks.length
        };

    } catch (error) {
        console.error('[ERROR] Error in text generation:', error);
        throw error;
    }
}

/**
 * Summarize text using AI models
 */
export async function summarizeText(text, options = {}) {
    try {
        console.log('[INFO] Starting text summarization');

        // Split text into chunks if needed
        const chunks = chunkText(text);
        console.log(`[INFO] Split text into ${chunks.length} chunks`);

        if (chunks.length === 1) {
            // Single chunk, process directly
            const result = await use_mcp_tool({
                server_name: 'chatsum',
                tool_name: 'summarize',
                arguments: {
                    text: chunks[0],
                    ...options
                }
            });
            console.log('[INFO] Text summarization complete');
            return result;
        }

        // Process each chunk
        const chunkSummaries = await Promise.all(chunks.map(async (chunk, index) => {
            console.log(`[INFO] Summarizing chunk ${index + 1}/${chunks.length}`);
            
            const result = await use_mcp_tool({
                server_name: 'chatsum',
                tool_name: 'summarize',
                arguments: {
                    text: chunk,
                    ...options,
                    is_chunk: true,
                    chunk_index: index,
                    total_chunks: chunks.length
                }
            });
            return result;
        }));

        // Merge chunk summaries
        const combinedSummary = chunkSummaries.map(s => s.summary).join(' ');
        
        // Generate final summary of combined summaries
        const finalResult = await use_mcp_tool({
            server_name: 'chatsum',
            tool_name: 'summarize',
            arguments: {
                text: combinedSummary,
                ...options,
                is_final: true
            }
        });

        console.log('[INFO] Text summarization complete');
        return {
            summary: finalResult.summary,
            length: finalResult.length,
            sentence_count: finalResult.sentence_count,
            confidence: average(chunkSummaries.map(s => s.confidence)),
            chunk_count: chunks.length
        };

    } catch (error) {
        console.error('[ERROR] Error in text summarization:', error);
        throw error;
    }
}

export default {
    analyzeText,
    generateText,
    summarizeText
};
