import { validateFile, formatValidationResult } from '../src/utils/file-validator.js';
import { getLogger } from '../src/utils/logging.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

async function checkFileSize(filePath) {
    try {
        console.log('\n=== File Size Analysis ===\n');

        // Load file
        const content = await fs.readFile(filePath, 'utf8');
        const filename = path.basename(filePath);
        const stats = await fs.stat(filePath);
        
        // Basic stats
        console.log('File Information:');
        console.log('-----------------');
        console.log(`Name: ${filename}`);
        console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Characters: ${content.length.toLocaleString()}`);
        console.log(`Estimated Tokens: ${Math.ceil(content.length / 4).toLocaleString()}\n`);

        // Validate file
        const validation = await validateFile(content, {
            type: filename.endsWith('.eml') ? 'email' : undefined
        });

        // Display validation results
        console.log('Validation Results:');
        console.log('------------------');
        console.log(formatValidationResult(validation));

        // Processing recommendations
        console.log('\nProcessing Recommendations:');
        console.log('-------------------------');
        if (!validation.canProcess) {
            console.log('❌ File cannot be processed directly:');
            validation.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
            
            // Chunking recommendation
            const chunks = Math.ceil(content.length / (150000 * 4)); // 150k tokens per chunk
            console.log('\nRecommended Action:');
            console.log(`Split file into ${chunks} parts of approximately ${(stats.size / chunks / 1024 / 1024).toFixed(2)}MB each`);
            
        } else {
            console.log('✓ File can be processed');
            if (validation.warnings.length > 0) {
                console.log('\nWarnings to consider:');
                validation.warnings.forEach(warning => {
                    console.log(`   - ${warning}`);
                });
            }

            // Processing details
            const chunks = Math.ceil(content.length / (150000 * 4));
            if (chunks > 1) {
                console.log('\nProcessing Details:');
                console.log(`- Will be split into ${chunks} chunks`);
                console.log(`- Average chunk size: ${(stats.size / chunks / 1024 / 1024).toFixed(2)}MB`);
                console.log(`- Estimated processing time: ${chunks * 5} seconds`);
            } else {
                console.log('\nProcessing Details:');
                console.log('- Will be processed as single chunk');
                console.log('- Estimated processing time: 5 seconds');
            }
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            file: {
                name: filename,
                size: stats.size,
                characters: content.length,
                estimated_tokens: Math.ceil(content.length / 4)
            },
            validation: {
                can_process: validation.canProcess,
                warnings: validation.warnings,
                errors: validation.errors
            },
            recommendations: {
                chunks_needed: Math.ceil(content.length / (150000 * 4)),
                chunk_size_mb: (stats.size / Math.ceil(content.length / (150000 * 4)) / 1024 / 1024),
                estimated_processing_time_seconds: Math.ceil(content.length / (150000 * 4)) * 5
            }
        };

        const reportPath = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, path.extname(filePath))}_size_report.json`
        );
        
        await fs.writeFile(
            reportPath,
            JSON.stringify(report, null, 2)
        );

        console.log(`\nDetailed report saved to: ${reportPath}`);
        console.log('\n=== Analysis Complete ===\n');

    } catch (error) {
        console.error('\nError analyzing file:', error.message);
        logger.error('File size check failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (process.argv[2]) {
    const filePath = process.argv[2];
    checkFileSize(filePath)
        .catch(error => {
            console.error('Check failed:', error);
            process.exit(1);
        });
} else {
    console.error('Please provide a file path');
    process.exit(1);
}

export default checkFileSize;
