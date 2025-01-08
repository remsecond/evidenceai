import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { processOFW } from '../src/services/ofw-processing.js';
import { getLogger } from '../utils/logging.js';
import { trackProcessingTime } from '../src/services/monitoring.js';

const logger = getLogger('validation');

// Enable debug logging
console.debug = (...args) => console.log('[DEBUG]', ...args);
console.info = (...args) => console.log('[INFO]', ...args);
console.error = (...args) => console.log('[ERROR]', ...args);

// Use project relative paths
const TEST_FILE = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
const RESULTS_DIR = path.join(process.cwd(), 'test-data', 'validation');

/**
 * Validate OFW processing with real data
 */
async function validateOFWProcessing() {
    try {
        logger.info('Starting OFW validation with real data');
        const startTime = Date.now();

        // Ensure results directory exists
        await fs.mkdir(RESULTS_DIR, { recursive: true });

        // Read test file
        console.info('Reading test file:', TEST_FILE);
        const content = await fs.readFile(TEST_FILE, 'utf8');
        console.info('File read successfully, size:', content.length, 'bytes');
        
        // Process in different chunk sizes to analyze optimal chunking
        const chunkSizes = [50000, 100000, 150000];
        const results = [];

        for (const chunkSize of chunkSizes) {
            logger.info(`Testing with chunk size: ${chunkSize}`);
            
            const testStart = Date.now();
            
            // Process with current chunk size
            console.info(`Starting OFW processing with chunk size ${chunkSize}`);
            const result = await processOFW(content, {
                format: { type: 'email', subtype: 'ofw' },
                options: { chunkSize, debug: true }
            });
            console.info('OFW processing completed');
            console.debug('Processing result:', JSON.stringify(result, null, 2));

            // Validate result structure
            if (!result || !result.metadata || !result.metadata.chunking) {
                console.error('Invalid result structure:', result);
                throw new Error('Processing result missing required metadata');
            }

            const duration = Date.now() - testStart;

            // Analyze results
            const analysis = {
                chunkSize,
                processingTime: duration,
                chunkCount: result.metadata.chunking.total_chunks,
                avgChunkProcessingTime: duration / result.metadata.chunking.total_chunks,
                entityPreservation: validateEntityPreservation(result),
                contextCoherence: validateContextCoherence(result),
                confidenceScores: analyzeConfidenceScores(result)
            };

            results.push(analysis);

            // Track metrics
            await trackProcessingTime('ofw_validation', duration, {
                chunkSize,
                chunkCount: result.metadata.chunking.total_chunks
            });

            // Save detailed results
            const resultPath = path.join(RESULTS_DIR, `validation-${chunkSize}-${Date.now()}.json`);
            await fs.writeFile(resultPath, JSON.stringify({
                metadata: result.metadata,
                analysis: analysis
            }, null, 2));
        }

        // Generate validation report
        const report = generateValidationReport(results, startTime);
        
        // Save validation report
        const reportPath = path.join(RESULTS_DIR, `validation-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        return report;
    } catch (error) {
        logger.error('Validation failed:', error);
        throw error;
    }
}

/**
 * Validate entity preservation across chunks
 */
function validateEntityPreservation(result) {
    const entities = result.analysis?.entities || {};
    const relationships = result.analysis?.entities?.relationships || [];
    
    return {
        totalEntities: Object.values(entities).flat().length,
        crossChunkRelationships: relationships.filter(r => r.crossChunk).length,
        preservationScore: calculatePreservationScore(entities, relationships)
    };
}

/**
 * Calculate entity preservation score
 */
function calculatePreservationScore(entities, relationships) {
    const totalRelationships = relationships.length;
    if (totalRelationships === 0) return 1;

    const preservedRelationships = relationships.filter(r => 
        !r.crossChunk || (r.crossChunk && r.confidence > 0.8)
    ).length;

    return preservedRelationships / totalRelationships;
}

/**
 * Validate context coherence between chunks
 */
function validateContextCoherence(result) {
    const semantic = result.analysis?.semantic || {};
    const keyPoints = semantic.key_points || [];
    
    return {
        coherenceScore: calculateCoherenceScore(keyPoints),
        contextualContinuity: validateContextualContinuity(keyPoints),
        semanticOverlap: calculateSemanticOverlap(keyPoints)
    };
}

/**
 * Calculate coherence score based on key points
 */
function calculateCoherenceScore(keyPoints) {
    if (keyPoints.length === 0) return 0;

    const coherentPoints = keyPoints.filter(point => 
        point.confidence > 0.7 && 
        !point.contextual_break &&
        point.supporting_evidence
    ).length;

    return coherentPoints / keyPoints.length;
}

/**
 * Validate contextual continuity between chunks
 */
function validateContextualContinuity(keyPoints) {
    if (keyPoints.length < 2) return 1;

    let continuityBreaks = 0;
    for (let i = 1; i < keyPoints.length; i++) {
        if (keyPoints[i].contextual_break) {
            continuityBreaks++;
        }
    }

    return 1 - (continuityBreaks / (keyPoints.length - 1));
}

/**
 * Calculate semantic overlap between chunks
 */
function calculateSemanticOverlap(keyPoints) {
    const topics = new Map();
    
    keyPoints.forEach(point => {
        const topic = point.topic || 'unknown';
        topics.set(topic, (topics.get(topic) || 0) + 1);
    });

    return Array.from(topics.values())
        .filter(count => count > 1).length / topics.size;
}

/**
 * Analyze confidence scores across chunks
 */
function analyzeConfidenceScores(result) {
    const scores = [];
    
    // Collect all confidence scores
    if (result.analysis?.semantic?.confidence) {
        scores.push(result.analysis.semantic.confidence);
    }
    
    if (result.analysis?.entities?.confidence) {
        scores.push(result.analysis.entities.confidence);
    }

    if (result.ofw?.custody_events) {
        result.ofw.custody_events.forEach(event => {
            if (event.confidence) scores.push(event.confidence);
        });
    }

    // Calculate statistics
    return {
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
        min: Math.min(...scores),
        max: Math.max(...scores),
        distribution: calculateScoreDistribution(scores)
    };
}

/**
 * Calculate distribution of confidence scores
 */
function calculateScoreDistribution(scores) {
    return {
        high: scores.filter(s => s >= 0.8).length,
        medium: scores.filter(s => s >= 0.5 && s < 0.8).length,
        low: scores.filter(s => s < 0.5).length
    };
}

/**
 * Generate validation report
 */
function generateValidationReport(results, startTime) {
    const totalTime = Date.now() - startTime;

    // Find optimal chunk size
    const optimal = results.reduce((prev, curr) => 
        (curr.contextCoherence.coherenceScore > prev.contextCoherence.coherenceScore) ? curr : prev
    );

    return {
        timestamp: new Date().toISOString(),
        totalValidationTime: totalTime,
        results: results,
        recommendation: {
            optimalChunkSize: optimal.chunkSize,
            reasoning: [
                `Best coherence score: ${optimal.contextCoherence.coherenceScore}`,
                `Processing time per chunk: ${optimal.avgChunkProcessingTime}ms`,
                `Entity preservation score: ${optimal.entityPreservation.preservationScore}`
            ]
        },
        validationMetrics: {
            averageCoherence: results.reduce((sum, r) => sum + r.contextCoherence.coherenceScore, 0) / results.length,
            averagePreservation: results.reduce((sum, r) => sum + r.entityPreservation.preservationScore, 0) / results.length,
            processingEfficiency: results.map(r => ({
                chunkSize: r.chunkSize,
                timePerChunk: r.avgChunkProcessingTime
            }))
        }
    };
}

// Run validation if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    validateOFWProcessing()
        .then(report => {
            console.log('\nValidation Report:');
            console.log(JSON.stringify(report, null, 2));
        })
        .catch(error => {
            console.error('Validation failed:', error);
            process.exit(1);
        });
}

export { validateOFWProcessing };
