const UniversalProcessor = require('../src/services/universal-processor');
const path = require('path');

describe('Real Data Processing', () => {
    const TEST_DATA_PATH = 'C:/Users/robmo/OneDrive/Documents/evidenceai_test/input/3_File_Nov_Jan_Test';
    
    const FILES = {
        OFW_PDF: 'OFW_Messages_Report_2025-01-12_09-01-06.pdf',
        EMAIL_PDF: 'Email exchange with christinemoyer_hotmail.com after 2024-10-31 before 2025-01-12.pdf',
        EMAIL_ODS: 'label Emails from christinemoyer@hotmail.com after 2024-10-31 before 2025-01-12.ods'
    };

    describe('Source Combinations with Real Data', () => {
        test('Process Complete Dataset (OFW + Email PDF + Email ODS)', async () => {
            const processor = new UniversalProcessor();
            
            // Process OFW PDF
            const ofwData = await processor.processOFW([{
                id: 'ofw-report',
                path: path.join(TEST_DATA_PATH, FILES.OFW_PDF),
                timestamp: '2025-01-12T09:01:06Z',
                metadata: {
                    type: 'ofw_report',
                    date_range: {
                        start: '2024-10-31',
                        end: '2025-01-12'
                    }
                }
            }]);

            // Process Email PDF
            const emailData = await processor.processEmails([{
                id: 'email-pdf',
                path: path.join(TEST_DATA_PATH, FILES.EMAIL_PDF),
                timestamp: '2025-01-12T09:26:00Z',
                metadata: {
                    type: 'email_exchange',
                    contact: 'christinemoyer@hotmail.com',
                    date_range: {
                        start: '2024-10-31',
                        end: '2025-01-12'
                    }
                }
            }]);

            // Process Email ODS (metadata/labels)
            const tableData = await processor.processTable([{
                id: 'email-labels',
                path: path.join(TEST_DATA_PATH, FILES.EMAIL_ODS),
                timestamp: '2025-01-12T09:37:00Z',
                type: 'email_metadata',
                source: 'christinemoyer@hotmail.com',
                date_range: {
                    start: '2024-10-31',
                    end: '2025-01-12'
                }
            }]);

            const brief = await processor.processAll({
                ofw: ofwData,
                emails: emailData,
                table: tableData
            });

            // Verify source availability
            expect(brief.metadata.sources.ofw.available).toBe(true);
            expect(brief.metadata.sources.email.available).toBe(true);
            expect(brief.metadata.sources.table.available).toBe(true);

            // Verify date range consistency
            const dateRanges = brief.content.messages
                .filter(msg => msg.metadata?.fields?.date_range)
                .map(msg => msg.metadata.fields.date_range);

            dateRanges.forEach(range => {
                expect(range.start).toBe('2024-10-31');
                expect(range.end).toBe('2025-01-12');
            });

            // Verify contact consistency
            const contacts = brief.content.messages
                .filter(msg => msg.metadata?.fields?.contact || msg.metadata?.fields?.source)
                .map(msg => msg.metadata.fields.contact || msg.metadata.fields.source);

            contacts.forEach(contact => {
                expect(contact).toBe('christinemoyer@hotmail.com');
            });

            // Verify timeline generation
            expect(brief.content.timeline.present).toBe(true);
            expect(brief.content.timeline.events.length).toBeGreaterThan(0);

            // Verify relationships
            expect(brief.content.relationships.present).toBe(true);
            expect(brief.content.relationships.data.length).toBeGreaterThan(0);

            // Verify high confidence due to complete dataset
            expect(brief.metadata.confidence.overall).toBeGreaterThan(0.8);
        });

        test('Process OFW + Email PDF Only', async () => {
            const processor = new UniversalProcessor();
            
            const brief = await processor.processAll({
                ofw: [{
                    id: 'ofw-report',
                    path: path.join(TEST_DATA_PATH, FILES.OFW_PDF),
                    timestamp: '2025-01-12T09:01:06Z'
                }],
                emails: [{
                    id: 'email-pdf',
                    path: path.join(TEST_DATA_PATH, FILES.EMAIL_PDF),
                    timestamp: '2025-01-12T09:26:00Z'
                }],
                table: []
            });

            // Verify source availability
            expect(brief.metadata.sources.ofw.available).toBe(true);
            expect(brief.metadata.sources.email.available).toBe(true);
            expect(brief.metadata.sources.table.available).toBe(false);

            // Verify timeline still works without metadata
            expect(brief.content.timeline.present).toBe(true);
            expect(brief.content.timeline.events.length).toBeGreaterThan(0);

            // Verify moderate confidence due to missing metadata
            expect(brief.metadata.confidence.overall).toBeLessThan(0.8);
            expect(brief.metadata.confidence.overall).toBeGreaterThan(0.5);
        });

        test('Process Single Source - OFW Only', async () => {
            const processor = new UniversalProcessor();
            
            const brief = await processor.processAll({
                ofw: [{
                    id: 'ofw-report',
                    path: path.join(TEST_DATA_PATH, FILES.OFW_PDF),
                    timestamp: '2025-01-12T09:01:06Z'
                }],
                emails: [],
                table: []
            });

            // Verify source availability
            expect(brief.metadata.sources.ofw.available).toBe(true);
            expect(brief.metadata.sources.email.available).toBe(false);
            expect(brief.metadata.sources.table.available).toBe(false);

            // Verify basic timeline still works
            expect(brief.content.timeline.present).toBe(true);
            expect(brief.content.timeline.events.length).toBeGreaterThan(0);

            // Verify lower confidence due to single source
            expect(brief.metadata.confidence.overall).toBeLessThan(0.6);
        });
    });

    describe('Data Quality Checks', () => {
        test('Verify Date Range Consistency', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll({
                ofw: [{
                    id: 'ofw-report',
                    path: path.join(TEST_DATA_PATH, FILES.OFW_PDF),
                    timestamp: '2025-01-12T09:01:06Z',
                    metadata: {
                        date_range: {
                            start: '2024-10-31',
                            end: '2025-01-12'
                        }
                    }
                }],
                emails: [],
                table: []
            });

            const events = brief.content.timeline.events;
            events.forEach(event => {
                const eventDate = new Date(event.timestamp);
                expect(eventDate >= new Date('2024-10-31')).toBe(true);
                expect(eventDate <= new Date('2025-01-12')).toBe(true);
            });
        });

        test('Verify Contact Information Consistency', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll({
                ofw: [],
                emails: [{
                    id: 'email-pdf',
                    path: path.join(TEST_DATA_PATH, FILES.EMAIL_PDF),
                    timestamp: '2025-01-12T09:26:00Z',
                    metadata: {
                        contact: 'christinemoyer@hotmail.com'
                    }
                }],
                table: []
            });

            const messages = brief.content.messages;
            messages.forEach(message => {
                if (message.metadata?.fields?.contact) {
                    expect(message.metadata.fields.contact).toBe('christinemoyer@hotmail.com');
                }
            });
        });
    });

    describe('LLM Integration', () => {
        test('Generate Appropriate Prompts for Real Data', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll({
                ofw: [{
                    id: 'ofw-report',
                    path: path.join(TEST_DATA_PATH, FILES.OFW_PDF),
                    timestamp: '2025-01-12T09:01:06Z'
                }],
                emails: [{
                    id: 'email-pdf',
                    path: path.join(TEST_DATA_PATH, FILES.EMAIL_PDF),
                    timestamp: '2025-01-12T09:26:00Z'
                }],
                table: [{
                    id: 'email-labels',
                    path: path.join(TEST_DATA_PATH, FILES.EMAIL_ODS),
                    timestamp: '2025-01-12T09:37:00Z'
                }]
            });

            const prompt = brief.generatePrompt();

            // Verify prompt includes all sources
            expect(prompt).toContain('OFW');
            expect(prompt).toContain('EMAIL');
            expect(prompt).toContain('TABLE');

            // Verify date range inclusion
            expect(prompt).toContain('2024-10-31');
            expect(prompt).toContain('2025-01-12');

            // Verify confidence scores
            expect(prompt).toMatch(/Overall Confidence: \d+\.\d+%/);
            expect(prompt).toMatch(/Temporal Confidence: \d+\.\d+%/);
            expect(prompt).toMatch(/Contextual Confidence: \d+\.\d+%/);
        });
    });
});
