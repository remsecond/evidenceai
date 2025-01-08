import { analyzeDocument } from '../src/services/document-analyzer.js';
import { getLogger } from '../src/utils/logging.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

/**
 * Analyze a batch of sample documents and generate insights
 */
async function analyzeSamples(options = {}) {
    const results = {
        formats: {},
        patterns: {},
        entities: {},
        outliers: [],
        suggestions: [],
        summary: {
            total_documents: 0,
            format_distribution: {},
            common_patterns: [],
            unique_entities: new Set(),
            processing_time: 0
        }
    };

    try {
        logger.info('Starting sample analysis');
        const startTime = Date.now();

        // Get all files from input directory
        const files = await getInputFiles(options.inputDir || 'test-data/input');

        // Process each file
        for (const file of files) {
            const content = await fs.readFile(file);
            const analysis = await analyzeDocument(content, path.basename(file));
            
            // Track format distribution
            results.formats[analysis.format.type] = results.formats[analysis.format.type] || [];
            results.formats[analysis.format.type].push({
                file: path.basename(file),
                confidence: analysis.format.confidence,
                indicators: analysis.format.indicators
            });

            // Track patterns
            trackPatterns(results.patterns, analysis.patterns);

            // Track entities
            trackEntities(results.entities, analysis.entities);

            // Check for outliers
            if (isOutlier(analysis)) {
                results.outliers.push({
                    file: path.basename(file),
                    reasons: getOutlierReasons(analysis)
                });
            }

            // Generate processing suggestions
            const suggestion = suggestProcessing(analysis);
            if (suggestion) {
                results.suggestions.push({
                    file: path.basename(file),
                    ...suggestion
                });
            }

            // Update summary
            results.summary.total_documents++;
            results.summary.format_distribution[analysis.format.type] = 
                (results.summary.format_distribution[analysis.format.type] || 0) + 1;
        }

        // Finalize summary
        results.summary.processing_time = Date.now() - startTime;
        results.summary.common_patterns = findCommonPatterns(results.patterns);
        results.summary.unique_entities = Array.from(results.summary.unique_entities);

        // Generate report
        await generateAnalysisReport(results);

        return results;
    } catch (error) {
        logger.error('Error analyzing samples', { error });
        throw error;
    }
}

/**
 * Get all files from input directory recursively
 */
async function getInputFiles(dir) {
    const files = [];
    
    async function scan(directory) {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            
            if (entry.isDirectory()) {
                await scan(fullPath);
            } else if (entry.isFile() && !entry.name.startsWith('.')) {
                files.push(fullPath);
            }
        }
    }
    
    await scan(dir);
    return files;
}

/**
 * Track patterns across documents
 */
function trackPatterns(patterns, documentPatterns) {
    // Track date formats
    documentPatterns.dates.forEach(date => {
        patterns.dates = patterns.dates || {};
        patterns.dates[date] = (patterns.dates[date] || 0) + 1;
    });

    // Track amount formats
    documentPatterns.amounts.forEach(amount => {
        patterns.amounts = patterns.amounts || {};
        patterns.amounts[amount] = (patterns.amounts[amount] || 0) + 1;
    });

    // Track identifiers
    documentPatterns.identifiers.forEach(identifier => {
        patterns.identifiers = patterns.identifiers || {};
        patterns.identifiers[identifier.type] = patterns.identifiers[identifier.type] || [];
        patterns.identifiers[identifier.type].push(identifier.value);
    });

    // Track custom patterns
    documentPatterns.custom.forEach(pattern => {
        patterns.custom = patterns.custom || {};
        patterns.custom[pattern.type] = patterns.custom[pattern.type] || [];
        patterns.custom[pattern.type].push(pattern.value);
    });
}

/**
 * Track entities across documents
 */
function trackEntities(entities, documentEntities) {
    // Track people
    documentEntities.people.forEach(person => {
        entities.people = entities.people || new Set();
        entities.people.add(person);
    });

    // Track organizations
    documentEntities.organizations.forEach(org => {
        entities.organizations = entities.organizations || new Set();
        entities.organizations.add(org);
    });

    // Track locations
    documentEntities.locations.forEach(location => {
        entities.locations = entities.locations || new Set();
        entities.locations.add(location);
    });
}

/**
 * Check if document analysis indicates an outlier
 */
function isOutlier(analysis) {
    return (
        analysis.format.confidence < 0.5 ||
        analysis.metadata.confidence_scores.overall < 0.5 ||
        hasUnusualPatterns(analysis.patterns) ||
        hasComplexStructure(analysis.structure)
    );
}

/**
 * Get reasons why document is considered an outlier
 */
function getOutlierReasons(analysis) {
    const reasons = [];

    if (analysis.format.confidence < 0.5) {
        reasons.push({
            type: 'low_format_confidence',
            details: `Format confidence: ${analysis.format.confidence}`
        });
    }

    if (analysis.metadata.confidence_scores.overall < 0.5) {
        reasons.push({
            type: 'low_overall_confidence',
            details: `Overall confidence: ${analysis.metadata.confidence_scores.overall}`
        });
    }

    if (hasUnusualPatterns(analysis.patterns)) {
        reasons.push({
            type: 'unusual_patterns',
            details: 'Document contains unexpected patterns'
        });
    }

    if (hasComplexStructure(analysis.structure)) {
        reasons.push({
            type: 'complex_structure',
            details: 'Document structure is more complex than usual'
        });
    }

    return reasons;
}

/**
 * Check if document has unusual patterns
 */
function hasUnusualPatterns(patterns) {
    // Consider a pattern unusual if it doesn't match common formats
    return (
        patterns.dates.some(date => !isCommonDateFormat(date)) ||
        patterns.amounts.some(amount => !isCommonAmountFormat(amount)) ||
        patterns.custom.length > 10
    );
}

/**
 * Check if document has complex structure
 */
function hasComplexStructure(structure) {
    return (
        structure.sections.length > 10 ||
        structure.tables.length > 5 ||
        structure.lists.length > 10
    );
}

/**
 * Suggest processing pipeline for document
 */
function suggestProcessing(analysis) {
    if (!analysis.pipeline) return null;

    return {
        format: analysis.format.type,
        confidence: analysis.format.confidence,
        suggested_pipeline: analysis.pipeline.steps,
        required_processors: analysis.pipeline.required_processors,
        validation_rules: analysis.pipeline.validation_rules
    };
}

/**
 * Find common patterns across documents
 */
function findCommonPatterns(patterns) {
    const common = [];

    // Find common date formats
    if (patterns.dates) {
        const dateFormats = Object.entries(patterns.dates)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        common.push({
            type: 'dates',
            formats: dateFormats.map(([format, count]) => ({ format, count }))
        });
    }

    // Find common amount formats
    if (patterns.amounts) {
        const amountFormats = Object.entries(patterns.amounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        common.push({
            type: 'amounts',
            formats: amountFormats.map(([format, count]) => ({ format, count }))
        });
    }

    // Find common identifier patterns
    if (patterns.identifiers) {
        Object.entries(patterns.identifiers).forEach(([type, values]) => {
            const commonFormats = findCommonFormat(values);
            if (commonFormats) {
                common.push({
                    type: `identifier_${type}`,
                    formats: commonFormats
                });
            }
        });
    }

    return common;
}

/**
 * Find common format in a list of values
 */
function findCommonFormat(values) {
    const patterns = values.map(value => {
        return value.replace(/\d/g, '#')
            .replace(/[a-zA-Z]/g, '@')
            .replace(/[^@#\s-]/g, '$');
    });

    const formatCounts = {};
    patterns.forEach(pattern => {
        formatCounts[pattern] = (formatCounts[pattern] || 0) + 1;
    });

    return Object.entries(formatCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([format, count]) => ({ format, count }));
}

/**
 * Generate analysis report
 */
async function generateAnalysisReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: results.summary,
        format_analysis: analyzeFormats(results.formats),
        pattern_analysis: analyzePatterns(results.patterns),
        entity_analysis: analyzeEntities(results.entities),
        outlier_analysis: analyzeOutliers(results.outliers),
        processing_recommendations: generateRecommendations(results)
    };

    // Save report
    const reportPath = path.join('test-data', 'analysis', `sample-analysis-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    logger.info(`Analysis report saved to ${reportPath}`);
    return report;
}

/**
 * Analyze format distribution and confidence
 */
function analyzeFormats(formats) {
    return Object.entries(formats).map(([type, documents]) => ({
        type,
        count: documents.length,
        average_confidence: documents.reduce((sum, doc) => sum + doc.confidence, 0) / documents.length,
        common_indicators: findCommonIndicators(documents.map(doc => doc.indicators))
    }));
}

/**
 * Find common indicators across documents
 */
function findCommonIndicators(documentIndicators) {
    const counts = {};
    documentIndicators.flat().forEach(indicator => {
        counts[indicator] = (counts[indicator] || 0) + 1;
    });
    
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([indicator, count]) => ({
            indicator,
            count,
            percentage: (count / documentIndicators.length) * 100
        }));
}

/**
 * Analyze patterns across documents
 */
function analyzePatterns(patterns) {
    return {
        date_formats: analyzeDateFormats(patterns.dates),
        amount_formats: analyzeAmountFormats(patterns.amounts),
        identifier_patterns: analyzeIdentifierPatterns(patterns.identifiers),
        custom_patterns: analyzeCustomPatterns(patterns.custom)
    };
}

/**
 * Generate processing recommendations
 */
function generateRecommendations(results) {
    const recommendations = [];

    // Format-specific recommendations
    Object.entries(results.formats).forEach(([format, documents]) => {
        if (documents.length >= 3) {
            recommendations.push({
                type: 'format_processor',
                format,
                priority: calculatePriority(documents.length, results.summary.total_documents),
                reason: `Common document format (${documents.length} documents)`
            });
        }
    });

    // Pattern-based recommendations
    if (results.summary.common_patterns.length > 0) {
        recommendations.push({
            type: 'pattern_processor',
            patterns: results.summary.common_patterns,
            priority: 'medium',
            reason: 'Common patterns detected across documents'
        });
    }

    // Outlier handling recommendations
    if (results.outliers.length > 0) {
        recommendations.push({
            type: 'outlier_processor',
            count: results.outliers.length,
            priority: calculatePriority(results.outliers.length, results.summary.total_documents),
            reason: 'Handle outlier documents with special processing'
        });
    }

    return recommendations;
}

/**
 * Calculate priority based on frequency
 */
function calculatePriority(count, total) {
    const percentage = (count / total) * 100;
    if (percentage > 30) return 'high';
    if (percentage > 10) return 'medium';
    return 'low';
}

/**
 * Helper functions for date/amount format validation
 */
function isCommonDateFormat(date) {
    const commonFormats = [
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // MM/DD/YYYY
        /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
        /^[A-Za-z]+ \d{1,2},? \d{4}$/    // Month DD, YYYY
    ];
    return commonFormats.some(format => format.test(date));
}

function isCommonAmountFormat(amount) {
    const commonFormats = [
        /^\$\d+(?:,\d{3})*(?:\.\d{2})?$/,     // $X,XXX.XX
        /^\d+(?:,\d{3})*(?:\.\d{2})?$/        // X,XXX.XX
    ];
    return commonFormats.some(format => format.test(amount));
}

// Run analysis if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const options = {
        inputDir: process.argv[2] || 'test-data/input'
    };
    
    analyzeSamples(options)
        .then(results => {
            console.log('\nAnalysis Summary:');
            console.log(JSON.stringify(results.summary, null, 2));
        })
        .catch(error => {
            console.error('Analysis failed:', error);
            process.exit(1);
        });
}

export { analyzeSamples };
