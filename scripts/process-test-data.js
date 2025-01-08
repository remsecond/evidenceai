import { validateFile, formatValidationResult } from '../src/utils/file-validator.js';
import { processDocument } from '../src/services/document-processing.js';
import { getLogger } from '../src/utils/logging.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

async function processTestData(filePath) {
    try {
        console.log('\n=== Processing Test Data ===\n');

        // Stage 1: Load and analyze file
        console.log('Stage 1: Loading test data...');
        const content = await fs.readFile(filePath, 'utf8');
        const filename = path.basename(filePath);
        const stats = await fs.stat(filePath);
        
        console.log(`File: ${filename}`);
        console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Characters: ${content.length.toLocaleString()}`);
        console.log(`Estimated Tokens: ${Math.ceil(content.length / 4).toLocaleString()}\n`);

        // Stage 2: Validate content
        console.log('Stage 2: Validating content...');
        const validation = await validateFile(content, {
            type: filename.endsWith('.eml') ? 'email' : undefined
        });

        console.log('\nValidation Results:');
        console.log(formatValidationResult(validation));

        if (!validation.canProcess) {
            throw new Error('Validation failed - see above for details');
        }

        // Stage 3: Process with chunking
        console.log('\nStage 3: Processing with chunking...');
        const startTime = Date.now();
        const result = await processDocument(content, filename);
        const endTime = Date.now();

        // Stage 4: Display results
        console.log('\nProcessing Results:');
        console.log('------------------');
        console.log('Chunking Details:');
        console.log(`- Total Chunks: ${result.metadata.chunking.total_chunks}`);
        console.log(`- Average Chunk Size: ${Math.ceil(result.metadata.processing_stats.avg_chunk_size).toLocaleString()} tokens`);
        console.log(`- Processing Time: ${(endTime - startTime) / 1000} seconds`);

        console.log('\nEfficiency Metrics:');
        console.log(`- Chunk Efficiency: ${(result.metadata.processing_stats.efficiency.chunk_efficiency * 100).toFixed(1)}%`);
        console.log(`- Parallel Efficiency: ${(result.metadata.processing_stats.efficiency.parallel_efficiency * 100).toFixed(1)}%`);
        console.log(`- Overall Efficiency: ${(result.metadata.processing_stats.efficiency.overall_efficiency * 100).toFixed(1)}%`);

        console.log('\nQuality Metrics:');
        console.log(`- Content Quality: ${Math.round(result.metadata.validation.encoding.printablePercentage * 100)}%`);
        console.log(`- Format Compliance: ${result.metadata.validation.quality.format_compliance ? 'Pass' : 'Warning'}`);
        console.log(`- Security Check: ${result.metadata.validation.security ? 'Pass' : 'Fail'}`);

        // Stage 5: Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            file: {
                name: filename,
                size: stats.size,
                characters: content.length,
                estimated_tokens: Math.ceil(content.length / 4)
            },
            validation: {
                result: validation.canProcess ? 'pass' : 'fail',
                warnings: validation.warnings,
                errors: validation.errors
            },
            processing: {
                chunks: {
                    total: result.metadata.chunking.total_chunks,
                    avg_size: result.metadata.processing_stats.avg_chunk_size,
                    efficiency: result.metadata.processing_stats.efficiency
                },
                timing: {
                    start: startTime,
                    end: endTime,
                    duration_ms: endTime - startTime
                },
                quality: {
                    content_quality: result.metadata.validation.encoding.printablePercentage,
                    format_compliance: result.metadata.validation.quality.format_compliance,
                    security: result.metadata.validation.security
                }
            }
        };

        const reportPath = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, path.extname(filePath))}_processing_report.json`
        );

        await fs.writeFile(
            reportPath,
            JSON.stringify(report, null, 2)
        );

        console.log(`\nDetailed report saved to: ${reportPath}`);
        console.log('\n=== Processing Complete ===\n');

        return result;

    } catch (error) {
        console.error('\nProcessing Error:', error.message);
        logger.error('Test data processing failed:', error);
        throw error;
    }
}

// Run if called directly
if (process.argv[2]) {
    const filePath = process.argv[2];
    processTestData(filePath)
        .catch(error => {
            console.error('Processing failed:', error);
            process.exit(1);
        });
}

export default processTestData;
