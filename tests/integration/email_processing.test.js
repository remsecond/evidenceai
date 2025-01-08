import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupLogging } from '../../src/utils/logging.js';
import { setupStorage, createFolder, uploadFile } from '../../src/services/storage.js';
import { setupAI, analyzeDocument } from '../../src/services/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Email Processing Integration', () => {
    let logger;
    const testEmailPath = path.join(__dirname, '../fixtures/sample_email.eml');

    beforeAll(async () => {
        logger = setupLogging();
        await setupStorage();
        await setupAI();
    });

    test('processes email thread correctly', async () => {
        // Read test email file
        const emailContent = fs.readFileSync(testEmailPath, 'utf8');
        
        // Create project folder
        const folder = await createFolder('Email_Test_Project');
        expect(folder).toBeDefined();
        expect(folder.id).toBeTruthy();

        // Upload email file
        const fileBuffer = Buffer.from(emailContent);
        const uploadedFile = await uploadFile(
            fileBuffer,
            'sample_email.eml',
            'message/rfc822',
            folder.id
        );
        expect(uploadedFile).toBeDefined();
        expect(uploadedFile.id).toBeTruthy();

        // Process email with chunking
        const { processRealDataset } = await import('../../scripts/process-real-data.js');
        const result = await processRealDataset([{
            id: 'test_email',
            filename: 'sample_email.eml',
            content: emailContent
        }]);
        expect(result).toBeDefined();
        expect(result.length).toBe(1);

        // Get the communication analysis from chunked processing
        const analysisObj = result[0].analysis;
        const communicationAnalysis = analysisObj.communication || {};

        // Verify analysis contains key information
        expect(communicationAnalysis.semantic).toBeDefined();
        expect(communicationAnalysis.entities).toBeDefined();
        expect(communicationAnalysis.timeline).toBeDefined();

        // Verify specific data points
        expect(communicationAnalysis.semantic.topics).toBeDefined();
        expect(communicationAnalysis.entities.people).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: expect.any(String),
                    type: 'person',
                    attributes: expect.any(Object)
                })
            ])
        );
        expect(communicationAnalysis.timeline.events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    timestamp: expect.any(String),
                    description: expect.any(String)
                })
            ])
        );

        // Verify key dates are extracted from timeline events
        const dates = new Set();
        communicationAnalysis.timeline.events.forEach(event => {
            if (event.timestamp) {
                dates.add(event.timestamp.split('T')[0]);
            }
        });
        expect(dates).toContain('2024-01-10'); // Initial planning phase
        expect(dates).toContain('2024-01-12'); // Team assignments
        expect(dates).toContain('2024-01-17'); // Development environment setup
        expect(dates).toContain('2024-01-25'); // Original presentation date
        expect(dates).toContain('2024-01-26'); // Proposed new presentation date
    });

    test('handles email thread relationships', async () => {
        const emailContent = fs.readFileSync(testEmailPath, 'utf8');
        
        // Process email with chunking
        const { processRealDataset } = await import('../../scripts/process-real-data.js');
        const result = await processRealDataset([{
            id: 'test_email_relationships',
            filename: 'sample_email.eml',
            content: emailContent
        }]);
        expect(result).toBeDefined();
        expect(result.length).toBe(1);

        // Get the communication analysis from chunked processing
        const analysisObj = result[0].analysis;
        const communicationAnalysis = analysisObj.communication || {};

        // Verify thread structure and relationships
        expect(communicationAnalysis.semantic).toBeDefined();
        expect(communicationAnalysis.semantic.topics).toBeDefined();
        expect(communicationAnalysis.entities).toBeDefined();
        expect(communicationAnalysis.entities.people).toBeDefined();
        expect(communicationAnalysis.timeline).toBeDefined();
        expect(communicationAnalysis.timeline.events).toBeDefined();

        // Verify relationship patterns
        expect(communicationAnalysis.complex).toBeDefined();
        expect(communicationAnalysis.complex.patterns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: expect.stringMatching(/relationship_pattern|communication_pattern/),
                    confidence: expect.any(Number)
                })
            ])
        );
    });
});
