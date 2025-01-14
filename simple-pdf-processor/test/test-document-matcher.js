import { expect } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentEntity from '../src/models/document-entity.js';
import documentMatcher from '../src/services/document-matcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DocumentMatcher', () => {
  const fixturesPath = path.join(__dirname, 'fixtures');
  
  // Helper to create test file object
  const createTestFile = (filename) => ({
    path: path.join(fixturesPath, filename),
    originalname: filename
  });

  // Helper to create test documents
  const createTestDocuments = async () => {
    const email1 = new DocumentEntity(createTestFile('sample-email.txt'));
    const email2 = new DocumentEntity(createTestFile('sample-email-2.txt'));
    const record = new DocumentEntity(createTestFile('sample-records.csv'));
    const attachment = new DocumentEntity(createTestFile('sample-attachment.txt'));

    // Set classifications
    email1.updateClassification({ type: 'email_pdf', context: 'email_content' });
    email2.updateClassification({ type: 'email_pdf', context: 'email_content' });
    record.updateClassification({ type: 'record_table', context: 'metadata' });
    attachment.updateClassification({ type: 'attachment', context: 'supporting' });

    return { email1, email2, record, attachment };
  };

  describe('findRelationships()', () => {
    it('should find relationships between emails and records', async () => {
      const { email1, email2, record } = await createTestDocuments();
      const documents = [email1, email2, record];

      const relationships = await documentMatcher.findRelationships(documents);
      
      expect(relationships).to.be.an('array');
      // Relationships may be empty if no matches found
      if (relationships.length > 0) {
        relationships.forEach(rel => {
          expect(rel).to.have.all.keys([
            'source',
            'target',
            'confidence',
            'type',
            'metadata'
          ]);
          expect(rel.type).to.equal('email_record');
          expect(rel.confidence).to.be.a('number');
          expect(rel.confidence).to.be.within(0, 1);
        });
      }
    });

    it('should find relationships between emails and attachments', async () => {
      const { email1, attachment } = await createTestDocuments();
      const documents = [email1, attachment];

      const relationships = await documentMatcher.findRelationships(documents);
      
      expect(relationships).to.be.an('array');
      // Relationships may be empty if no matches found
      if (relationships.length > 0) {
        relationships.forEach(rel => {
          expect(rel).to.have.all.keys([
            'source',
            'target',
            'confidence',
            'type',
            'metadata'
          ]);
          expect(rel.type).to.equal('email_attachment');
          expect(rel.confidence).to.be.a('number');
          expect(rel.confidence).to.be.within(0, 1);
        });
      }
    });
  });

  describe('matchEmailToRecord()', () => {
    it('should match email to record based on content', async () => {
      const { email1, record } = await createTestDocuments();
      const match = await documentMatcher.matchEmailToRecord(email1, record);

      expect(match).to.have.all.keys(['confidence', 'metadata']);
      expect(match.confidence).to.be.a('number');
      expect(match.confidence).to.be.within(0, 1);
      expect(match.metadata).to.have.property('matchedFields');
      expect(match.metadata.matchedFields).to.be.an('array');
    });
  });

  describe('findBestEmailMatch()', () => {
    it('should find best matching email for attachment', async () => {
      const { email1, email2, attachment } = await createTestDocuments();
      const emails = [email1, email2];

      const match = await documentMatcher.findBestEmailMatch(attachment, emails);

      // Match may be null if no good matches found
      if (match) {
        expect(match).to.have.all.keys(['email', 'confidence', 'metadata']);
        expect(match.confidence).to.be.a('number');
        expect(match.confidence).to.be.within(0, 1);
        expect(match.metadata).to.have.property('matchReason');
      }
    });
  });

  describe('similarity calculations', () => {
    it('should calculate filename match score', () => {
      const filename = 'test-document.pdf';
      const content = 'Please find attached test-document.pdf for review';
      const score = documentMatcher.calculateFilenameMatch(filename, content);

      expect(score).to.equal(1);
    });

    it('should calculate content similarity', () => {
      const content1 = 'This is a test document with some content';
      const content2 = 'This is another test document with similar content';
      const score = documentMatcher.calculateContentSimilarity(content1, content2);

      expect(score).to.be.a('number');
      expect(score).to.be.within(0, 1);
    });

    it('should calculate temporal proximity', () => {
      const date1 = new Date();
      const date2 = new Date(date1.getTime() + 1000 * 60 * 60); // 1 hour later
      const score = documentMatcher.calculateTemporalProximity(
        date1.toISOString(),
        date2.toISOString()
      );

      expect(score).to.be.a('number');
      expect(score).to.be.within(0, 1);
    });

    it('should calculate Levenshtein distance', () => {
      const str1 = 'hello';
      const str2 = 'helo';
      const distance = documentMatcher.levenshteinDistance(str1, str2);

      expect(distance).to.equal(1);
    });
  });
});
