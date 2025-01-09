import fs from 'fs';
import { join } from 'path';
import { SIZE_LIMITS, checkFileSize, formatSizeCheckResult } from './src/utils/file-size-checker.js';

/**
 * Basic test to verify we can:
 * 1. Read a PDF file
 * 2. Check its size
 * 3. Save file information
 */
async function testBasicPipeline() {
    try {
        console.log('\n=== Basic Pipeline Test ===\n');
        
        // Test file path
        const testFile = 'C:/Users/robmo/OneDrive/Documents/evidenceai_test/input/OFW_Messages_Report_Dec.pdf';
        console.log('Test file:', testFile);
        
        // 1. Verify file exists and get stats
        if (!fs.existsSync(testFile)) {
            throw new Error(`Test file not found: ${testFile}`);
        }
        
        const stats = fs.statSync(testFile);
        console.log('\nFile Information:');
        console.log('-----------------');
        console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Created: ${stats.birthtime}`);
        console.log(`Modified: ${stats.mtime}`);
        
        // 2. Check size against our limits
        console.log('\nSize Limits:');
        console.log('-----------');
        console.log(`Single Chunk: ${SIZE_LIMITS.SINGLE_CHUNK / 1024 / 1024} MB`);
        console.log(`Small File: ${SIZE_LIMITS.SMALL_FILE / 1024 / 1024} MB`);
        console.log(`Medium File: ${SIZE_LIMITS.MEDIUM_FILE / 1024 / 1024} MB`);
        console.log(`Max Size: ${SIZE_LIMITS.MAX_SIZE / 1024 / 1024} MB`);
        
        const sizeCheck = checkFileSize(stats.size);
        console.log('\nSize Check Results:');
        console.log('-----------------');
        console.log(formatSizeCheckResult(sizeCheck));
        
        // 3. Save results
        const outputDir = join('demos', 'basic-pipeline-test');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const result = {
            file_info: {
                path: testFile,
                size_bytes: stats.size,
                size_mb: (stats.size / 1024 / 1024).toFixed(2),
                created: stats.birthtime,
                modified: stats.mtime
            },
            size_check: sizeCheck,
            timestamp: new Date().toISOString()
        };
        
        const outputPath = join(outputDir, 'file-info.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\nResults saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('Error running basic pipeline test:', error);
        process.exit(1);
    }
}

testBasicPipeline();
