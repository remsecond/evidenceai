import pdfProcessor from './src/processors/pdf/pdf-processor.js';
import fs from 'fs';
import { join } from 'path';
import { getLogger } from './src/utils/logging.js';

const logger = getLogger();

async function testPdfExtraction() {
    try {
        console.log('\n=== PDF Extraction Test ===\n');
        
        // Test file path
        const testFile = 'test-data/OFW_Messages_Report_Dec.pdf';
        console.log('Test file:', testFile);
        
        // Process PDF
        console.log('\nProcessing PDF...');
        const result = await pdfProcessor.process(testFile);
        
        // Log document statistics
        console.log('\nDocument Statistics:');
        console.log('-----------------');
        console.log('Pages:', result.raw_content?.structure?.pages || 'N/A');
        console.log('Words:', (result.statistics?.words || 0).toLocaleString());
        console.log('Paragraphs:', result.statistics?.paragraphs || 'N/A');
        console.log('Total Characters:', (result.statistics?.characters || 0).toLocaleString());
        console.log('Processing Time:', (result.processing_meta?.processing_time_ms || 0) + 'ms');

        // Log chunking analysis
        console.log('\nChunking Analysis:');
        console.log('-----------------');
        console.log('Total Chunks:', result.statistics?.chunks || 0);
        console.log('Average Chunk Size:', (result.statistics?.average_chunk_size || 0) + ' tokens');
        console.log('Estimated Total Tokens:', (result.statistics?.estimated_total_tokens || 0).toLocaleString());

        // Log detailed chunk information
        console.log('\nStructured Chunks:');
        console.log('-----------------');
        result.raw_content.chunks.forEach((chunk, index) => {
            console.log(`\nChunk ${index + 1}/${chunk.metadata.total_chunks}:`);
            console.log(`Type: ${chunk.metadata.type}`);
            console.log(`Section: ${chunk.metadata.section}`);
            console.log(`Size: ${chunk.estimated_tokens.toLocaleString()} tokens`);
            if (chunk.metadata.continues) {
                console.log('Status: Continues in next chunk');
            }
            if (chunk.metadata.part) {
                console.log(`Part ${chunk.metadata.part} of ${chunk.metadata.total_parts}`);
            }
        });
        
        // Save results in a timestamped directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = join('demos', `pdf-extraction-test-${timestamp}`);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save full results
        const outputPath = join(outputDir, 'extraction-result.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\nComplete results saved to: ${outputPath}`);
        
        // Save raw text and individual chunks
        const textPath = join(outputDir, 'raw-text.txt');
        fs.writeFileSync(textPath, result.raw_content.text);
        
        // Save each chunk separately for analysis
        const chunksDir = join(outputDir, 'chunks');
        fs.mkdirSync(chunksDir, { recursive: true });
        result.raw_content.chunks.forEach((chunk, index) => {
            const chunkPath = join(chunksDir, `chunk-${index + 1}.txt`);
            const chunkContent = `METADATA:\n${JSON.stringify(chunk.metadata, null, 2)}\n\nCONTENT:\n${chunk.text}`;
            fs.writeFileSync(chunkPath, chunkContent);
        });
        
        console.log('\nTest complete. You can verify:');
        console.log('1. extraction-result.json - Complete extraction data');
        console.log('2. raw-text.txt - Unaltered document text');
        console.log('3. chunks/ - Individual chunks with metadata');
        
    } catch (error) {
        console.error('Error running PDF extraction test:', error);
        process.exit(1);
    }
}

// First install dependencies
console.log('Installing dependencies...');
const { execSync } = await import('child_process');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('Dependencies installed successfully\n');
    await testPdfExtraction();
} catch (error) {
    console.error('Error installing dependencies:', error);
    process.exit(1);
}
