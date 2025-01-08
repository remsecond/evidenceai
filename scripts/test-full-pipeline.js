import { validateFile, formatValidationResult } from '../src/utils/file-validator.js';
import { processDocument } from '../src/services/document-processing.js';
import { processEmail } from '../src/services/email-processing.js';
import { processOFW } from '../src/services/ofw-processing.js';
import { getLogger } from '../src/utils/logging.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

/**
 * Test full processing pipeline
 */
async function testFullPipeline(filePath) {
    try {
        logger.info('Starting full pipeline test:', filePath);
        console.log('\n=== Starting Pipeline Test ===\n');

        // Stage 1: Read file
        console.log('Stage 1: Reading file...');
        const content = await fs.readFile(filePath, 'utf8');
        const filename = path.basename(filePath);
        console.log(`File loaded: ${filename} (${content.length} bytes)\n`);

        // Stage 2: Initial validation
        console.log('Stage 2: Validating file...');
        const validation = await validateFile(content, {
            type: filename.endsWith('.eml') ? 'email' : undefined
        });
        console.log('\nValidation Results:');
        console.log(formatValidationResult(validation));

        if (!validation.canProcess) {
            throw new Error('File validation failed');
        }

        // Stage 3: Determine processing type
        console.log('\nStage 3: Determining processing type...');
        let result;
        if (filename.endsWith('.eml')) {
            console.log('Processing as email document');
            result = await processEmail(content, {
                format: 'email',
                structure: 'rfc822'
            });
        } else if (filename.includes('ofw')) {
            console.log('Processing as OFW document');
            result = await processOFW(content, {
                format: 'ofw',
                structure: 'sections'
            });
        } else {
            console.log('Processing as general document');
            result = await processDocument(content, filename);
        }

        // Stage 4: Display results
        console.log('\nStage 4: Processing complete\n');
        console.log('Processing Statistics:');
        console.log('---------------------');
        console.log(`Total Size: ${result.metadata.chunking.size_analysis.total_size_mb.toFixed(2)}MB`);
        console.log(`Total Tokens: ${result.metadata.processing_stats.total_tokens_processed.toLocaleString()}`);
        console.log(`Chunks Used: ${result.metadata.chunking.total_chunks}`);
        console.log(`Processing Time: ${result.metadata.processing_stats.processing_time}ms`);
        
        console.log('\nQuality Metrics:');
        console.log('---------------');
        console.log(`Content Quality: ${Math.round(result.metadata.validation.encoding.printablePercentage * 100)}%`);
        console.log(`Format Compliance: ${result.metadata.validation.quality.format_compliance ? 'Pass' : 'Warning'}`);
        console.log(`Security Check: ${result.metadata.validation.security ? 'Pass' : 'Fail'}`);

        console.log('\nChunking Efficiency:');
        console.log('------------------');
        console.log(`Chunk Efficiency: ${(result.metadata.processing_stats.efficiency.chunk_efficiency * 100).toFixed(1)}%`);
        console.log(`Parallel Efficiency: ${(result.metadata.processing_stats.efficiency.parallel_efficiency * 100).toFixed(1)}%`);
        console.log(`Overall Efficiency: ${(result.metadata.processing_stats.efficiency.overall_efficiency * 100).toFixed(1)}%`);

        // Stage 5: Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            filename,
            validation: {
                size: validation.size,
                encoding: validation.encoding,
                quality: validation.quality,
                security: validation.security
            },
            processing: {
                type: filename.endsWith('.eml') ? 'email' : 
                      filename.includes('ofw') ? 'ofw' : 'document',
                stats: result.metadata.processing_stats,
                chunking: result.metadata.chunking
            },
            analysis: {
                semantic: result.analysis.semantic,
                entities: result.analysis.entities,
                validation: result.analysis.validation
            }
        };

        const reportPath = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, path.extname(filePath))}_report.json`
        );
        
        await fs.writeFile(
            reportPath,
            JSON.stringify(report, null, 2)
        );

        console.log(`\nDetailed report saved to: ${reportPath}`);
        console.log('\n=== Pipeline Test Complete ===\n');

        return result;

    } catch (error) {
        console.error('\nPipeline Error:', error.message);
        logger.error('Pipeline test failed:', error);
        throw error;
    }
}

// Run test if called directly
if (process.argv[2]) {
    const filePath = process.argv[2];
    testFullPipeline(filePath)
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

export default testFullPipeline;
