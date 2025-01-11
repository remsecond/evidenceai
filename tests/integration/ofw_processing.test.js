import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../../src/utils/logging.js';
import { setupStorage, createFolder, uploadFile } from '../../src/services/storage.js';
import { setupAI } from '../../src/services/ai.js';
import { analyzeDocument } from '../../src/services/document-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('OFW Message Processing Integration', () => {
    let logger;
    const testOFWPath = path.join(__dirname, '../fixtures/ofw/OFW_Messages_Report_Dec.pdf');

    beforeAll(async () => {
        logger = getLogger();
        await setupStorage();
        await setupAI();
    });

    test('processes OFW messages correctly', async () => {
        // Read test OFW file
        const ofwBuffer = fs.readFileSync(testOFWPath);
        
        // Mock PDF content for testing
        // In production, we would use a PDF parsing library here
        const mockTextContent = `
=== Communication Log ===
Parent1: Requesting schedule change for doctor appointment
Date: 2024-01-15
Time: 10:30 AM

Parent2: Acknowledged, will adjust schedule
Date: 2024-01-15
Time: 11:45 AM

=== Schedule Changes ===
Original Date: 2024-01-20
New Date: 2024-01-22
Reason: Medical appointment

=== Notes ===
Change documented and confirmed by both parties
`;

        // Create project folder
        const folder = await createFolder('OFW_Test_Project');
        expect(folder).toBeDefined();
        expect(folder.id).toBeTruthy();

        // Upload OFW file
        const uploadedFile = await uploadFile(
            ofwBuffer,
            'OFW_Messages_Report_Dec.pdf',
            'application/pdf',
            folder.id
        );
        expect(uploadedFile).toBeDefined();
        expect(uploadedFile.id).toBeTruthy();

        // Process OFW with chunking
        const { processRealDataset } = await import('../../scripts/process-real-data.js');
        const result = await processRealDataset([{
            id: 'test_ofw',
            filename: 'OFW_Messages_Report_Dec.pdf',
            content: mockTextContent
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
        expect(communicationAnalysis.semantic.key_points).toBeDefined();
        expect(communicationAnalysis.semantic.summary).toBeDefined();
        expect(communicationAnalysis.semantic.initial_patterns).toBeDefined();
        
        expect(communicationAnalysis.entities.entities.people).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: expect.any(String),
                    type: 'person',
                    attributes: expect.any(Object)
                })
            ])
        );

        expect(communicationAnalysis.timeline).toBeDefined();
        expect(communicationAnalysis.timeline.events).toBeDefined();
    });

    test('analyzes OFW communication patterns', async () => {
        // Mock PDF content for testing patterns
        const mockTextContent = `
=== Communication Log ===
Parent1: Can we discuss summer vacation plans?
Date: 2024-01-10
Time: 9:00 AM
Tone: Neutral

Parent2: Yes, I've been meaning to bring that up
Date: 2024-01-10
Time: 10:15 AM
Tone: Positive

=== Schedule Discussion ===
Parent1: I'd like to take the kids to the beach July 1-7
Date: 2024-01-10
Time: 2:30 PM
Tone: Neutral

Parent2: That works with my schedule
Date: 2024-01-10
Time: 3:45 PM
Tone: Positive
`;

        // Process OFW with chunking
        const { processRealDataset } = await import('../../scripts/process-real-data.js');
        const result = await processRealDataset([{
            id: 'test_ofw_patterns',
            filename: 'OFW_Messages_Report_Dec.pdf',
            content: mockTextContent
        }]);
        expect(result).toBeDefined();
        expect(result.length).toBe(1);

        // Get the communication analysis
        const analysisObj = result[0].analysis;
        const communicationAnalysis = analysisObj.communication || {};

        // Verify complex analysis
        expect(communicationAnalysis.complex).toBeDefined();
        expect(communicationAnalysis.complex.patterns).toBeDefined();
        expect(communicationAnalysis.complex.tone).toBeDefined();
        expect(communicationAnalysis.complex.tone.overall).toBeDefined();
        expect(communicationAnalysis.complex.tone.segments).toBeDefined();
    });
});
