import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfProcessor from '../src/services/pdf-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    try {
        console.log('=== Environment Details ===');
        console.log('Current directory:', process.cwd());
        console.log('Script directory:', __dirname);
        console.log('Node version:', process.version);
        console.log('\n=== Environment Variables ===');
        console.log('INPUT_FILE:', process.env.INPUT_FILE);
        console.log('OUTPUT_DIR:', process.env.OUTPUT_DIR);
        
        // Get input/output paths from environment variables or use defaults
        const inputFile = process.env.INPUT_FILE || path.join(__dirname, 'test-data', 'OFW_Messages_Report_Dec.pdf');
        const outputDir = process.env.OUTPUT_DIR || path.join(__dirname, 'processed');

        console.log('\n=== Path Resolution ===');
        console.log(`Input file: ${inputFile}`);
        console.log(`Output directory: ${outputDir}`);

        // Verify input file exists
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Input file not found: ${inputFile}`);
        }

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            console.log('Creating output directory...');
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        console.log('\nStarting PDF extraction...');
        console.log('Using pdf-processor service for proper chunking...');
        
        const startTime = Date.now();
        const result = await pdfProcessor.processPdf(inputFile);
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`\nProcessing completed in ${processingTime}s`);
        console.log(`Created ${result.raw_content.chunks.length} chunks`);
        
        // Save the full results
        const outputFile = path.join(outputDir, 'extraction-result.json');

        // Save both raw text and structured results
        fs.writeFileSync(
            path.join(outputDir, 'raw-text.txt'),
            result.raw_content.text
        );
        
        fs.writeFileSync(
            outputFile,
            JSON.stringify(result, null, 2)
        );

        // Save individual chunks for inspection
        const chunksDir = path.join(outputDir, 'chunks');
        if (!fs.existsSync(chunksDir)) {
            fs.mkdirSync(chunksDir, { recursive: true });
        }

        result.raw_content.chunks.forEach((chunk, index) => {
            fs.writeFileSync(
                path.join(chunksDir, `chunk-${index + 1}.json`),
                JSON.stringify({
                    text: chunk.text,
                    metadata: chunk.metadata,
                    estimated_tokens: chunk.estimated_tokens
                }, null, 2)
            );
        });

        console.log('\nSaved output files:');
        console.log('- raw-text.txt: Complete extracted text');
        console.log('- extraction-result.json: Full processing results');
        console.log(`- chunks/: ${result.raw_content.chunks.length} individual chunks`);

        // Exit successfully
        process.exit(0);
    } catch (error) {
        console.error('\nError during processing:', error.message);
        process.exit(1);
    }
}

// Run the async main function
main().catch(error => {
    console.error('\nUnhandled error:', error);
    process.exit(1);
});
