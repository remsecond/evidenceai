import { routeDocument } from '../src/services/document-router.js';
import { getLogger } from '../utils/logging.js';
import { trackProcessingTime, trackProcessingResult } from '../src/services/monitoring.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = getLogger();
const INPUT_DIR = 'C:/Users/robmo/OneDrive/Documents/evidenceai_test/input';

/**
 * Ensure required directories exist
 */
async function ensureDirectories() {
    const REQUIRED_DIRS = [
        'logs',
        'storage/metrics',
        'storage/reports',
        'test-data/analysis'
    ];

    for (const dir of REQUIRED_DIRS) {
        await fs.mkdir(dir, { recursive: true });
    }
}

/**
 * Analyze OFW email samples
 */
async function analyzeOFWSamples() {
    const results = {
        total: 0,
        routed_to_ofw: 0,
        routed_to_other: 0,
        outliers: 0,
        patterns: new Set(),
        entities: new Set(),
        confidence_scores: [],
        processing_times: []
    };

    try {
        // Ensure directories exist
        await ensureDirectories();

        logger.info('Starting OFW sample analysis');
        const startTime = Date.now();

        // Get all files
        const files = await fs.readdir(INPUT_DIR);

        // Process each file
        for (const file of files) {
            const filePath = path.join(INPUT_DIR, file);
            logger.info(`Processing file: ${file}`);
            
            const fileStartTime = Date.now();
            
            try {
                const content = await fs.readFile(filePath, 'utf8');

                // Route document
                const routingResult = await routeDocument(content, file);
                
                // Track processing time and result
                const duration = Date.now() - fileStartTime;
                await trackProcessingTime('file_processing', duration, {
                    type: routingResult.processor,
                    filename: file
                });
                
                await trackProcessingResult({
                    type: routingResult.processor,
                    name: file
                }, {
                    status: 'success',
                    confidence: routingResult.confidence,
                    processor: routingResult.processor,
                    duration
                });

                // Track results
                results.total++;
                if (routingResult.processor === 'ofw_email') {
                    results.routed_to_ofw++;
                } else if (routingResult.processor.includes('outlier')) {
                    results.outliers++;
                } else {
                    results.routed_to_other++;
                }

                // Track patterns and entities
                trackPatterns(results.patterns, routingResult.analysis.patterns);
                trackEntities(results.entities, routingResult.analysis.entities);

                // Track confidence and timing
                results.confidence_scores.push({
                    file,
                    confidence: routingResult.confidence,
                    processor: routingResult.processor
                });
                results.processing_times.push({
                    file,
                    time: routingResult.processing_time
                });

                // Log progress
                logger.info(`Processed ${file}`, {
                    processor: routingResult.processor,
                    confidence: routingResult.confidence
                });
            } catch (error) {
                logger.error(`Error processing file: ${file}`, { error });
                results.total++;
                results.routed_to_other++;
            }
        }

        // Generate summary
        const summary = generateSummary(results, startTime);
        
        // Save analysis report
        await saveAnalysisReport(results, summary);

        return summary;
    } catch (error) {
        logger.error('Error analyzing OFW samples', { error });
        throw error;
    }
}

/**
 * Track patterns found in documents
 */
function trackPatterns(patterns, documentPatterns) {
    // Track date patterns
    documentPatterns.dates?.forEach(date => patterns.add(`date:${date}`));

    // Track custom patterns
    documentPatterns.custom?.forEach(pattern => 
        patterns.add(`${pattern.type}:${pattern.value}`)
    );

    // Track identifiers
    documentPatterns.identifiers?.forEach(identifier =>
        patterns.add(`${identifier.type}:${identifier.value}`)
    );
}

/**
 * Track entities found in documents
 */
function trackEntities(entities, documentEntities) {
    documentEntities.people?.forEach(person => entities.add(`person:${person}`));
    documentEntities.organizations?.forEach(org => entities.add(`org:${org}`));
    documentEntities.locations?.forEach(loc => entities.add(`location:${loc}`));
}

/**
 * Generate analysis summary
 */
function generateSummary(results, startTime) {
    const totalTime = Date.now() - startTime;
    const avgConfidence = results.confidence_scores.reduce((sum, score) => 
        sum + score.confidence, 0) / results.total;
    const avgProcessingTime = results.processing_times.reduce((sum, timing) =>
        sum + timing.time, 0) / results.total;

    return {
        total_documents: results.total,
        routing_summary: {
            ofw_processor: results.routed_to_ofw,
            other_processors: results.routed_to_other,
            outliers: results.outliers
        },
        confidence: {
            average: avgConfidence,
            distribution: calculateConfidenceDistribution(results.confidence_scores)
        },
        patterns: {
            total_unique: results.patterns.size,
            common: findCommonPatterns(Array.from(results.patterns))
        },
        entities: {
            total_unique: results.entities.size,
            by_type: categorizeEntities(Array.from(results.entities))
        },
        performance: {
            total_time: totalTime,
            average_per_document: avgProcessingTime,
            throughput: (results.total / totalTime) * 1000 // docs per second
        }
    };
}

/**
 * Calculate confidence score distribution
 */
function calculateConfidenceDistribution(scores) {
    return {
        high: scores.filter(s => s.confidence >= 0.8).length,
        medium: scores.filter(s => s.confidence >= 0.5 && s.confidence < 0.8).length,
        low: scores.filter(s => s.confidence < 0.5).length
    };
}

/**
 * Find common patterns in documents
 */
function findCommonPatterns(patterns) {
    const counts = {};
    patterns.forEach(pattern => {
        counts[pattern] = (counts[pattern] || 0) + 1;
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pattern, count]) => ({
            pattern,
            count,
            percentage: (count / patterns.length) * 100
        }));
}

/**
 * Categorize entities by type
 */
function categorizeEntities(entities) {
    const categories = {
        people: [],
        organizations: [],
        locations: [],
        other: []
    };

    entities.forEach(entity => {
        const [type, value] = entity.split(':');
        switch (type) {
            case 'person':
                categories.people.push(value);
                break;
            case 'org':
                categories.organizations.push(value);
                break;
            case 'location':
                categories.locations.push(value);
                break;
            default:
                categories.other.push(value);
        }
    });

    return categories;
}

/**
 * Save analysis report
 */
async function saveAnalysisReport(results, summary) {
    const report = {
        timestamp: new Date().toISOString(),
        summary,
        details: {
            confidence_scores: results.confidence_scores,
            processing_times: results.processing_times,
            patterns: Array.from(results.patterns),
            entities: Array.from(results.entities)
        }
    };

    const reportPath = path.join('test-data', 'analysis', `ofw-analysis-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    logger.info(`Analysis report saved to ${reportPath}`);
}

// Run analysis if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    analyzeOFWSamples()
        .then(summary => {
            console.log('\nAnalysis Summary:');
            console.log(JSON.stringify(summary, null, 2));
        })
        .catch(error => {
            console.error('Analysis failed:', error);
            process.exit(1);
        });
}

export { analyzeOFWSamples };
