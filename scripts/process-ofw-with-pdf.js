import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// First, install pdf-parse
try {
    execSync('npm install pdf-parse', { stdio: 'inherit' });
} catch (error) {
    console.error('Failed to install pdf-parse:', error);
    process.exit(1);
}

// Dynamic import for pdf-parse since it's installed at runtime
const pdfParse = (await import('pdf-parse')).default;

// Configure pdf-parse to not look for test files
process.env.PDF_TEST_SKIP = 'true';

// Import the proper PDF processor
import pdfProcessor from '../src/services/pdf-processor.js';

// Create output directories for each AI model
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const aiModels = ['claude', 'deepseek', 'gpt4', 'notebooklm', 'sonnet'];
const resultsDirs = {};

aiModels.forEach(model => {
    resultsDirs[model] = path.join(process.cwd(), 'ai-outputs', model, `ofw-processing-${timestamp}`);
    if (!fs.existsSync(resultsDirs[model])) {
        fs.mkdirSync(resultsDirs[model], { recursive: true });
    }
});

// Default to deepseek for now, we'll add specific processing for each model later
const resultsDir = resultsDirs.deepseek;

// Process OFW file using proper chunking
async function processOFWNow() {
    try {
        // Get PDF path from command line argument or use default
        const pdfPath = process.argv[2] || path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        console.log('Processing PDF with enhanced chunking...');
        const result = await pdfProcessor.processPdf(pdfPath);
        
        // Save extracted text
        console.log('Saving extracted text...');
        fs.writeFileSync(
            path.join(resultsDir, 'extracted-text.txt'),
            result.raw_content.text
        );
        
        // Save chunks with metadata
        console.log('Saving chunks...');
        result.raw_content.chunks.forEach((chunk, index) => {
            const chunkInfo = {
                text: chunk.text,
                metadata: chunk.metadata,
                estimated_tokens: chunk.estimated_tokens
            };
            fs.writeFileSync(
                path.join(resultsDir, `chunk-${index + 1}.json`),
                JSON.stringify(chunkInfo, null, 2)
            );
        });
        
        // Save detailed processing report
        const report = {
            timestamp: new Date().toISOString(),
            file_info: result.file_info,
            structure: result.raw_content.structure,
            statistics: result.statistics,
            processing_meta: result.processing_meta
        };
        
        console.log('Saving report...');
        fs.writeFileSync(
            path.join(resultsDir, 'processing-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log('Processing complete!');
        return report;
    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync(
            path.join(resultsDir, 'error.log'),
            `${error.message}\n${error.stack}`
        );
        throw error;
    }
}

// Run it
console.log('Starting OFW processing...');
processOFWNow()
    .then(report => {
        console.log('Success! Report:', JSON.stringify(report, null, 2));
        fs.writeFileSync(
            path.join(resultsDir, 'success.log'),
            JSON.stringify(report, null, 2)
        );
    })
    .catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
