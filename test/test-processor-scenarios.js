const UniversalProcessor = require('../src/services/universal-processor');

describe('UniversalProcessor Scenarios', () => {
    // Sample data for testing
    const sampleData = {
        ofw: [
            {
                id: 'ofw-1',
                timestamp: '2024-01-01T10:00:00Z',
                content: 'Initial contact regarding project timeline',
                metadata: {
                    category: 'project',
                    priority: 'high'
                }
            }
        ],
        emails: [
            {
                id: 'email-1',
                timestamp: '2024-01-01T10:05:00Z',
                subject: 'Re: Project Timeline',
                content: 'Confirming receipt of timeline details',
                attachments: [
                    {
                        name: 'timeline.pdf',
                        type: 'application/pdf',
                        size: 125000
                    }
                ]
            }
        ],
        table: [
            {
                id: 'record-1',
                timestamp: '2024-01-01T10:10:00Z',
                type: 'timeline_update',
                status: 'confirmed',
                assignee: 'Team Lead'
            }
        ]
    };

    describe('Real-world Scenarios', () => {
        test('Complete Dataset - All Sources Available', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll(sampleData);

            // Verify source availability
            expect(brief.metadata.sources.ofw.available).toBe(true);
            expect(brief.metadata.sources.email.available).toBe(true);
            expect(brief.metadata.sources.table.available).toBe(true);

            // Verify data integration
            expect(brief.content.messages.length).toBe(3);
            expect(brief.content.timeline.events.length).toBe(3);
            expect(brief.content.relationships.data.length).toBeGreaterThan(0);

            // Verify high confidence due to complete data
            expect(brief.metadata.confidence.overall).toBeGreaterThan(0.8);

            // Check LLM prompt generation
            const prompt = brief.generatePrompt();
            expect(prompt).toContain('OFW, EMAIL, TABLE');
            expect(prompt).toContain('Overall Confidence:');
        });

        test('Partial Dataset - OFW Only', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll({
                ofw: sampleData.ofw,
                emails: [],
                table: []
            });

            // Verify source availability
            expect(brief.metadata.sources.ofw.available).toBe(true);
            expect(brief.metadata.sources.email.available).toBe(false);
            expect(brief.metadata.sources.table.available).toBe(false);

            // Verify data handling
            expect(brief.content.messages.length).toBe(1);
            expect(brief.content.timeline.events.length).toBe(1);

            // Verify adjusted confidence for partial data
            expect(brief.metadata.confidence.overall).toBeLessThan(0.8);

            // Check LLM prompt adaptation
            const prompt = brief.generatePrompt();
            expect(prompt).toContain('Available Sources: OFW');
            expect(prompt).toContain('Note: 2 source(s) unavailable');
        });

        test('Dual Source Dataset - OFW + Email', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll({
                ofw: sampleData.ofw,
                emails: sampleData.emails,
                table: []
            });

            // Verify source availability
            expect(brief.metadata.sources.ofw.available).toBe(true);
            expect(brief.metadata.sources.email.available).toBe(true);
            expect(brief.metadata.sources.table.available).toBe(false);

            // Verify cross-source relationships
            expect(brief.content.relationships.data.length).toBeGreaterThan(0);
            expect(brief.content.relationships.data[0].type).toBe('temporal_proximity');

            // Verify moderate confidence level
            expect(brief.metadata.confidence.overall).toBeGreaterThan(0.6);
        });

        test('Time-Ordered Processing', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll(sampleData);

            // Verify chronological ordering
            const events = brief.content.timeline.events;
            for (let i = 1; i < events.length; i++) {
                const prevTime = new Date(events[i-1].timestamp);
                const currTime = new Date(events[i].timestamp);
                expect(prevTime <= currTime).toBe(true);
            }
        });

        test('Attachment Handling', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll({
                ofw: [],
                emails: sampleData.emails,
                table: []
            });

            // Verify attachment metadata preservation
            const emailMessage = brief.content.messages.find(m => m.source === 'email');
            expect(emailMessage.attachments.present).toBe(true);
            expect(emailMessage.attachments.details[0].name).toBe('timeline.pdf');
        });

        test('Metadata Integration', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll(sampleData);

            // Verify metadata preservation across sources
            const ofwMessage = brief.content.messages.find(m => m.source === 'ofw');
            expect(ofwMessage.metadata.present).toBe(true);
            expect(ofwMessage.metadata.fields.category).toBe('project');

            const tableMessage = brief.content.messages.find(m => m.source === 'table');
            expect(tableMessage.metadata.present).toBe(true);
            expect(tableMessage.metadata.fields.type).toBe('timeline_update');
        });

        test('Analysis Generation', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll(sampleData);

            // Verify analysis completeness
            expect(brief.content.analysis.present).toBe(true);
            expect(brief.content.analysis.summary).toContain('3 source(s)');
            expect(brief.content.analysis.keyPoints.length).toBeGreaterThan(0);

            // Verify confidence reporting
            const confidencePoint = brief.content.analysis.keyPoints.find(
                point => point.includes('Data completeness')
            );
            expect(confidencePoint).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        test('Empty Dataset', async () => {
            const processor = new UniversalProcessor();
            const brief = await processor.processAll({
                ofw: [],
                emails: [],
                table: []
            });

            expect(brief.metadata.confidence.overall).toBe(0);
            expect(brief.content.analysis.summary).toContain('insufficient data');
        });

        test('Missing Timestamps', async () => {
            const processor = new UniversalProcessor();
            const incompleteData = {
                ofw: [{
                    id: 'ofw-1',
                    content: 'Message without timestamp'
                }],
                emails: [],
                table: []
            };

            const brief = await processor.processAll(incompleteData);
            expect(brief.content.timeline.events.length).toBe(0);
            expect(brief.metadata.confidence.temporal).toBe(0);
        });

        test('Duplicate Messages', async () => {
            const processor = new UniversalProcessor();
            const duplicateData = {
                ofw: [sampleData.ofw[0], sampleData.ofw[0]],
                emails: [],
                table: []
            };

            const brief = await processor.processAll(duplicateData);
            expect(brief.content.messages.length).toBe(2);
            expect(brief.content.relationships.data.length).toBeGreaterThan(0);
        });
    });
});
