import { routeDocument } from '../src/services/document-router.js';
import fs from 'fs';
import path from 'path';

async function runTestPipeline() {
    try {
        console.log('Starting test pipeline...');

        // Read sample email
        const emailPath = path.join(process.cwd(), 'tests/fixtures/sample_email.eml');
        const emailContent = fs.readFileSync(emailPath, 'utf8');
        console.log('Loaded sample email:', emailPath);

        // Process document
        console.log('Processing document...');
        const result = await routeDocument(emailContent, 'sample_email.eml');
        console.log('Processing complete. Result:', JSON.stringify(result, null, 2));

        // Basic validation
        if (!result.success) {
            throw new Error('Processing failed: ' + result.error);
        }

        console.log('Test pipeline completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Test pipeline failed:', error);
        process.exit(1);
    }
}

runTestPipeline();
