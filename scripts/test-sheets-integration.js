import googleSheets from '../src/services/google-sheets.js';
import { getLogger } from '../src/utils/logging.js';

const logger = getLogger();

// Test document data
const testDocument = {
    id: 'test-doc-001',
    fileName: 'test-document.pdf',
    type: 'PDF',
    pages: 10,
    wordCount: 5000
};

// Test category
const testCategory = {
    name: 'Legal Documents',
    documentCount: 1,
    description: 'Legal and contractual documents'
};

// Test status update
const testStatus = {
    status: 'Processing',
    stage: 'PDF Extraction',
    estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
    message: 'Extracting text from PDF'
};

async function testGoogleSheetsIntegration() {
    try {
        logger.info('Starting Google Sheets integration test');

        // Load credentials from environment
        const credentials = {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            project_id: process.env.GOOGLE_PROJECT_ID
        };

        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        if (!spreadsheetId) {
            throw new Error('GOOGLE_SHEET_ID environment variable not set');
        }

        // Initialize service
        logger.info('Initializing Google Sheets service');
        await googleSheets.initialize(credentials, spreadsheetId);

        // Create sheet structure
        logger.info('Creating tracking sheet structure');
        await googleSheets.createTrackingSheet();

        // Add test document
        logger.info('Adding test document');
        await googleSheets.addDocument(testDocument);

        // Update document status
        logger.info('Updating document status');
        await googleSheets.updateStatus(testDocument.id, testStatus);

        // Add test category
        logger.info('Adding test category');
        await googleSheets.updateCategory(testCategory);

        // Update document metadata
        logger.info('Updating document metadata');
        await googleSheets.updateMetadata(testDocument.id, {
            pages: testDocument.pages,
            wordCount: testDocument.wordCount,
            processingTime: '2.5s'
        });

        logger.info('Google Sheets integration test completed successfully');
    } catch (error) {
        logger.error('Google Sheets integration test failed:', error);
        throw error;
    }
}

// Run test
testGoogleSheetsIntegration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
