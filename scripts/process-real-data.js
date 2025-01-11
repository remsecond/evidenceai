import { getLogger } from '../src/utils/logging.js';
import { trackProcessingTime, trackBatch, trackQueueLength } from '../src/services/monitoring.js';
import { analyzeDocument } from '../src/services/document-analyzer.js';
import { processOFWEmail } from '../src/services/ofw-processing.js';
import { analyzeText } from '../src/services/ai.js';

const logger = getLogger();

// Load processing configuration from environment
const CONFIG = {
    CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '100000'),
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '50'),
    MAX_CONCURRENT: parseInt(process.env.MAX_CONCURRENT || '10'),
    MEMORY_LIMIT: parseFloat(process.env.MEMORY_LIMIT || '0.8'),
    QUEUE_LIMIT: parseInt(process.env.QUEUE_LIMIT || '1000')
};

// Log configuration
logger.info('Processing configuration:', CONFIG);

// Track active processing
const activeProcessing = new Set();
const processingQueue = [];

/**
 * Process a batch of documents with monitoring
 */
async function processBatch(documents) {
    const startTime = Date.now();
    const results = [];
    
    try {
        logger.info(`Processing batch of ${documents.length} documents`);

        // Track batch metrics
        trackBatch('document_processing', documents.length, 0);
        
        // Process documents in parallel with limits
        const promises = documents.map(async (doc) => {
            // Wait if too many active processes
            while (activeProcessing.size >= CONFIG.MAX_CONCURRENT) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Track this process
            const processId = `doc_${Date.now()}_${Math.random()}`;
            activeProcessing.add(processId);

            try {
                // Process document with chunking
                const result = await processDocumentWithChunking(doc);
                results.push(result);
            } finally {
                activeProcessing.delete(processId);
            }
        });

        await Promise.all(promises);

        // Track final batch metrics
        const duration = Date.now() - startTime;
        trackBatch('document_processing', documents.length, duration);

        logger.info(`Batch processing complete`, {
            documentCount: documents.length,
            duration,
            successCount: results.length
        });

        return results;
    } catch (error) {
        logger.error('Error processing batch', { error });
        throw error;
    }
}

/**
 * Process single document with chunking
 */
async function processDocumentWithChunking(doc) {
    const startTime = Date.now();
    
    try {
        // Initial analysis to determine structure
        const analysis = await analyzeDocument(doc.content);
        
        // Split content into logical chunks based on OFW structure
        const chunks = splitOFWContent(doc.content, analysis);
        
        // Process each chunk
        const chunkResults = await Promise.all(chunks.map(async chunk => {
            // Run appropriate analyses based on chunk type
            const analyses = {};
            
            if (chunk.type === 'communication' || chunk.type === 'custody_logs') {
                // Use unified AI analysis with built-in chunking
                const aiResult = await analyzeText(chunk.content, {
                    type: chunk.type,
                    metadata: chunk.metadata
                });
                
                analyses.semantic = aiResult.semantic;
                analyses.entities = aiResult.entities;
                analyses.validation = aiResult.validation;
                analyses.timeline = aiResult.timeline;
                analyses.complex = aiResult.complex;
            }
            
            return {
                type: chunk.type,
                content: chunk.content,
                analyses
            };
        }));
        
        // Combine results maintaining OFW structure
        const result = combineOFWResults(chunkResults, analysis);
        
        // Track processing time
        const duration = Date.now() - startTime;
        trackProcessingTime('document_processing', duration);
        
        return result;
    } catch (error) {
        logger.error('Error processing document', { error });
        throw error;
    }
}

/**
 * Split OFW content into logical chunks
 */
function splitOFWContent(content, analysis) {
    const chunks = [];
    
    try {
        // Split based on OFW sections
        const sections = content.split(/(?=={3,}\s*\n)/);
        
        sections.forEach(section => {
            // Determine section type
            const type = determineOFWSection(section);
            
            // Split large sections if needed
            if (section.length > CONFIG.CHUNK_SIZE) {
                // Split on natural boundaries (paragraphs, entries)
                const subChunks = section.split(/\n\s*\n/)
                    .reduce((acc, part) => {
                        if (!acc.length || 
                            (acc[acc.length - 1].length + part.length > CONFIG.CHUNK_SIZE)) {
                            acc.push(part);
                        } else {
                            acc[acc.length - 1] += '\n\n' + part;
                        }
                        return acc;
                    }, []);
                
                // Add each sub-chunk
                subChunks.forEach(chunk => {
                    chunks.push({
                        type,
                        content: chunk,
                        metadata: { isPartial: true }
                    });
                });
            } else {
                chunks.push({
                    type,
                    content: section,
                    metadata: { isPartial: false }
                });
            }
        });
        
        logger.debug('Content split into chunks', {
            totalChunks: chunks.length,
            types: chunks.map(c => c.type)
        });
        
        return chunks;
    } catch (error) {
        logger.error('Error splitting content', { error });
        throw error;
    }
}

/**
 * Determine OFW section type
 */
function determineOFWSection(content) {
    if (/custody.*exchange|schedule.*change|violation/i.test(content)) {
        return 'custody_logs';
    }
    if (/communication|expense|medical|education/i.test(content)) {
        return 'communication';
    }
    if (/schedule|holiday|vacation/i.test(content)) {
        return 'schedule';
    }
    return 'other';
}

/**
 * Combine chunk results maintaining OFW structure
 */
function combineOFWResults(chunkResults, analysis) {
    try {
        // Group results by type
        const groupedResults = chunkResults.reduce((acc, chunk) => {
            if (!acc[chunk.type]) {
                acc[chunk.type] = [];
            }
            acc[chunk.type].push(chunk);
            return acc;
        }, {});
        
        // Combine analyses for each type
        const combinedAnalyses = {};
        Object.entries(groupedResults).forEach(([type, chunks]) => {
            combinedAnalyses[type] = {
                semantic: combineSemanticAnalyses(chunks),
                entities: combineEntityAnalyses(chunks),
                timeline: combineTimelineAnalyses(chunks),
                complex: combineComplexAnalyses(chunks)
            };
        });
        
        return {
            analysis: combinedAnalyses,
            metadata: {
                processingDetails: {
                    chunkCount: chunkResults.length,
                    types: Object.keys(groupedResults)
                }
            }
        };
    } catch (error) {
        logger.error('Error combining results', { error });
        throw error;
    }
}

// Analysis combination helpers
function combineSemanticAnalyses(chunks) {
    const semanticResults = chunks.map(c => c.analyses.semantic).filter(Boolean);
    if (semanticResults.length === 0) return null;
    
    return {
        key_points: semanticResults.flatMap(r => r.key_points || []),
        summary: semanticResults.map(r => r.summary).join(' '),
        initial_patterns: Array.from(new Set(semanticResults.flatMap(r => r.initial_patterns || []))),
        confidence: semanticResults.reduce((acc, r) => acc + (r.confidence || 0), 0) / semanticResults.length
    };
}

function combineEntityAnalyses(chunks) {
    const entityResults = chunks.map(c => c.analyses.entities).filter(Boolean);
    if (entityResults.length === 0) return null;

    return {
        entities: {
            people: Array.from(new Set(entityResults.flatMap(r => r.entities?.people || []))),
            organizations: Array.from(new Set(entityResults.flatMap(r => r.entities?.organizations || []))),
            dates: Array.from(new Set(entityResults.flatMap(r => r.entities?.dates || [])))
        },
        relationships: entityResults.flatMap(r => r.relationships || []),
        cross_references: entityResults.flatMap(r => r.cross_references || []),
        metadata: {
            confidence_scores: {
                entity_extraction: average(entityResults.map(r => r.metadata?.confidence_scores?.entity_extraction || 0)),
                relationship_detection: average(entityResults.map(r => r.metadata?.confidence_scores?.relationship_detection || 0)),
                cross_reference_resolution: average(entityResults.map(r => r.metadata?.confidence_scores?.cross_reference_resolution || 0))
            }
        }
    };
}

/**
 * Combine timeline analyses from multiple chunks
 */
function combineTimelineAnalyses(chunks) {
    const timelineResults = chunks.map(c => c.analyses.timeline).filter(Boolean);
    if (timelineResults.length === 0) return null;

    return {
        events: timelineResults.flatMap(r => r.events || []).sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        }),
        metadata: {
            total_events: timelineResults.reduce((acc, r) => acc + (r.events?.length || 0), 0),
            date_range: {
                start: timelineResults.reduce((earliest, r) => {
                    const dates = r.events?.map(e => new Date(e.timestamp)) || [];
                    const min = dates.length ? Math.min(...dates) : earliest;
                    return earliest ? Math.min(earliest, min) : min;
                }, null),
                end: timelineResults.reduce((latest, r) => {
                    const dates = r.events?.map(e => new Date(e.timestamp)) || [];
                    const max = dates.length ? Math.max(...dates) : latest;
                    return latest ? Math.max(latest, max) : max;
                }, null)
            },
            confidence: average(timelineResults.map(r => r.metadata?.confidence || 0))
        }
    };
}

/**
 * Combine complex analyses from multiple chunks
 */
function combineComplexAnalyses(chunks) {
    const complexResults = chunks.map(c => c.analyses.complex).filter(Boolean);
    if (complexResults.length === 0) return null;

    return {
        patterns: Array.from(new Set(complexResults.flatMap(r => r.patterns || []))),
        tone: {
            overall: complexResults.reduce((acc, r) => {
                if (!r.tone?.overall) return acc;
                return {
                    sentiment: r.tone.overall.sentiment,
                    intensity: (acc?.intensity || 0) + r.tone.overall.intensity
                };
            }, null),
            segments: complexResults.flatMap(r => r.tone?.segments || []).sort((a, b) => {
                return new Date(a.timestamp) - new Date(b.timestamp);
            })
        },
        metadata: {
            confidence: average(complexResults.map(r => r.metadata?.confidence || 0)),
            pattern_count: complexResults.reduce((acc, r) => acc + (r.patterns?.length || 0), 0)
        }
    };
}

/**
 * Calculate average of numbers
 */
function average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Main processing function - Simple sequential processing
 */
export async function processRealDataset(documents) {
    try {
        logger.info('Starting real dataset processing');
        
        const results = [];
        for (const doc of documents) {
            logger.info(`Processing document ${results.length + 1}/${documents.length}`);
            
            // Simple two-pass processing
            const result = await analyzeText(doc.content, {
                focus: doc.type || 'general'
            });
            
            results.push({
                id: doc.id,
                ...result
            });
            
            // Basic progress tracking
            trackProcessingTime('document_processing', Date.now() - result.metadata.processing_time);
        }
        
        logger.info('Dataset processing complete', {
            totalDocuments: documents.length,
            successfulResults: results.length
        });
        
        return results;
    } catch (error) {
        logger.error('Error processing dataset', { error });
        throw error;
    }
}

export default {
    processRealDataset
};
