import { expect } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentEntity from '../src/models/document-entity.js';
import timelineProcessor from '../src/services/timeline-processor.js';
import googleSheets from '../../src/services/google-sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TimelineProcessor', () => {
    const fixturesPath = path.join(__dirname, 'fixtures');
    
    // Helper to create test file object
    const createTestFile = (filename) => ({
        path: path.join(fixturesPath, filename),
        originalname: filename
    });

    // Helper to create test documents
    const createTestDocuments = async () => {
        const email = new DocumentEntity(createTestFile('sample-email.txt'));
        const record = new DocumentEntity(createTestFile('sample-records.csv'));
        const attachment = new DocumentEntity(createTestFile('sample-attachment.txt'));

        // Set classifications
        email.updateClassification({ type: 'email_pdf', context: 'email_content' });
        record.updateClassification({ type: 'record_table', context: 'metadata' });
        attachment.updateClassification({ type: 'attachment', context: 'supporting' });

        return { email, record, attachment };
    };

    describe('processDocument()', () => {
        it('should process single document into timeline event', async () => {
            const { email } = await createTestDocuments();
            const timelineEvent = await timelineProcessor.processDocument(email);

            // Verify timeline schema
            expect(timelineEvent).to.have.property('temporal_info');
            expect(timelineEvent).to.have.property('relationships');
            expect(timelineEvent).to.have.property('event_info');
            expect(timelineEvent).to.have.property('storage_info');

            // Verify temporal info
            expect(timelineEvent.temporal_info).to.have.property('event_date');
            expect(timelineEvent.temporal_info).to.have.property('date_confidence');
            expect(timelineEvent.temporal_info.date_confidence).to.be.within(0, 1);

            // Verify event info
            expect(timelineEvent.event_info).to.have.property('type');
            expect(timelineEvent.event_info).to.have.property('actors');
            expect(timelineEvent.event_info.actors).to.be.an('array');
        });

        it('should handle missing temporal information gracefully', async () => {
            const { attachment } = await createTestDocuments();
            const timelineEvent = await timelineProcessor.processDocument(attachment);

            expect(timelineEvent.temporal_info.event_date).to.be.null;
            expect(timelineEvent.temporal_info.date_confidence).to.equal(0);
        });
    });

    describe('processDocumentSet()', () => {
        it('should process related documents with relationships', async () => {
            const { email, record, attachment } = await createTestDocuments();
            const documents = [email, record, attachment];
            
            const timelineEvents = await timelineProcessor.processDocumentSet(documents);

            expect(timelineEvents).to.be.an('array');
            expect(timelineEvents).to.have.length(3);

            // Verify relationships are established
            const hasRelationships = timelineEvents.some(event => 
                event.relationships.related_documents.length > 0
            );
            expect(hasRelationships).to.be.true;

            // Verify temporal relationships
            const hasTemporalRelationships = timelineEvents.some(event =>
                event.relationships.related_documents.some(rel =>
                    rel.temporal_relationship !== 'unknown'
                )
            );
            expect(hasTemporalRelationships).to.be.true;
        });

        it('should handle attachment copying', async () => {
            const { email, attachment } = await createTestDocuments();
            const documents = [email, attachment];
            
            const timelineEvents = await timelineProcessor.processDocumentSet(documents);

            // Find attachment event
            const attachmentEvent = timelineEvents.find(event => 
                event.file_info.path === attachment.path
            );

            expect(attachmentEvent).to.exist;
            expect(attachmentEvent.storage_info.attachment_dir).to.exist;
        });
    });

    describe('Google Sheets integration', () => {
        it('should create timeline sheet with events', async () => {
            const { email, record } = await createTestDocuments();
            const documents = [email, record];
            
            const timelineEvents = await timelineProcessor.processDocumentSet(documents);
            const sheetId = await googleSheets.createTimelineSheet('Test Timeline');
            const success = await googleSheets.addTimelineEvents(timelineEvents);

            expect(success).to.be.true;
        });

        it('should track attachments in separate sheet', async () => {
            const { email, attachment } = await createTestDocuments();
            const documents = [email, attachment];
            
            const timelineEvents = await timelineProcessor.processDocumentSet(documents);
            const sheetId = await googleSheets.createTimelineSheet('Test Timeline');
            await googleSheets.addAttachmentSheet(sheetId);

            // Track attachment
            const attachmentEvent = timelineEvents.find(event => 
                event.file_info.path === attachment.path
            );
            const success = await googleSheets.trackAttachment({
                original_path: attachmentEvent.file_info.path,
                path: path.join(attachmentEvent.storage_info.attachment_dir, path.basename(attachment.path)),
                parent_id: email.id,
                type: attachment.classification.type,
                size: attachmentEvent.file_info.size_bytes,
                created: attachmentEvent.file_info.created,
                modified: attachmentEvent.file_info.modified
            });

            expect(success).to.be.true;
        });
    });

    describe('temporal analysis', () => {
        it('should extract dates from content', async () => {
            const content = `
                Meeting scheduled for January 15, 2024
                Follow-up due by 2024-02-01
                Previous discussion from Dec 25, 2023
            `;

            const temporalInfo = await timelineProcessor.extractTemporalInfo(content);

            expect(temporalInfo.event_date).to.be.instanceOf(Date);
            expect(temporalInfo.related_dates).to.have.length(2);
            expect(temporalInfo.date_confidence).to.be.above(0);
        });

        it('should determine temporal relationships between events', () => {
            const source = {
                event_date: new Date('2024-01-15')
            };
            const target = {
                event_date: new Date('2024-01-16')
            };

            const relationship = timelineProcessor.determineTemporalRelationship(source, target);
            expect(relationship).to.equal('before');
        });

        it('should handle missing dates in relationship determination', () => {
            const source = {
                event_date: new Date('2024-01-15')
            };
            const target = {
                event_date: null
            };

            const relationship = timelineProcessor.determineTemporalRelationship(source, target);
            expect(relationship).to.equal('unknown');
        });
    });

    describe('event extraction', () => {
        it('should extract actors from content', async () => {
            const content = `
                From: john@example.com
                To: mary@example.com
                CC: support@company.com
                
                Meeting discussion...
            `;

            const eventInfo = await timelineProcessor.extractEventInfo(content);

            expect(eventInfo.actors).to.include('john@example.com');
            expect(eventInfo.actors).to.include('mary@example.com');
            expect(eventInfo.actors).to.include('support@company.com');
        });

        it('should set appropriate event type', async () => {
            const { email } = await createTestDocuments();
            const timelineEvent = await timelineProcessor.processDocument(email);

            expect(timelineEvent.event_info.type).to.equal('communication');
        });
    });
});
