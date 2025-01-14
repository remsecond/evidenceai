import { expect } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import packageAnalyzer from '../src/services/package-analyzer-v2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PackageAnalyzer V2', () => {
  const fixturesPath = path.join(__dirname, 'fixtures');
  
  // Helper to create file objects
  const createTestFile = (filename) => ({
    path: path.join(fixturesPath, filename),
    originalname: filename
  });

  describe('analyzeUpload()', () => {
    it('should detect PDF_ONLY package', async () => {
      const files = [
        createTestFile('sample-email.txt'),
        createTestFile('sample-email-2.txt')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      
      expect(result.type).to.equal('PDF_ONLY');
      expect(result.documents.emails).to.have.lengthOf(2);
      expect(result.documents.records).to.be.null;
      expect(result.documents.others).to.have.lengthOf(0);

      // Verify document entities
      result.documents.emails.forEach(doc => {
        expect(doc.classification.type).to.equal('email_pdf');
        expect(doc.classification.context).to.equal('email_content');
      });
    });

    it('should detect PDF_WITH_RECORDS package', async () => {
      const files = [
        createTestFile('sample-email.txt'),
        createTestFile('sample-records.json')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      
      expect(result.type).to.equal('PDF_WITH_RECORDS');
      expect(result.documents.emails).to.have.lengthOf(1);
      expect(result.documents.records).to.not.be.null;
      expect(result.documents.others).to.have.lengthOf(0);

      // Verify relationships
      const email = result.documents.emails[0];
      const record = result.documents.records;
      
      expect(email.relationships.companions).to.include(record.id);
      expect(record.relationships.context).to.include(email.id);
    });

    it('should detect PDF_WITH_OTHERS package', async () => {
      const files = [
        createTestFile('sample-email.txt'),
        createTestFile('sample-attachment.txt')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      
      expect(result.type).to.equal('PDF_WITH_OTHERS');
      expect(result.documents.emails).to.have.lengthOf(1);
      expect(result.documents.records).to.be.null;
      expect(result.documents.others).to.have.lengthOf(1);

      // Verify relationships
      const email = result.documents.emails[0];
      const attachment = result.documents.others[0];
      
      expect(email.relationships.companions).to.include(attachment.id);
      expect(attachment.relationships.context).to.include(email.id);
    });

    it('should handle unknown package types', async () => {
      const files = [
        createTestFile('sample-attachment.txt')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      
      expect(result.type).to.equal('UNKNOWN');
      expect(result.documents.emails).to.have.lengthOf(0);
      expect(result.documents.records).to.be.null;
      expect(result.documents.others).to.have.lengthOf(1);
    });
  });

  describe('document classification', () => {
    it('should classify email PDFs correctly', async () => {
      const file = createTestFile('sample-email.txt');
      const doc = await packageAnalyzer.createDocument(file);

      expect(doc.classification).to.deep.include({
        type: 'email_pdf',
        context: 'email_content'
      });
    });

    it('should classify record tables correctly', async () => {
      const file = createTestFile('sample-records.json');
      const doc = await packageAnalyzer.createDocument(file);

      expect(doc.classification).to.deep.include({
        type: 'record_table',
        context: 'metadata'
      });
    });

    it('should classify attachments correctly', async () => {
      const file = createTestFile('sample-attachment.txt');
      const doc = await packageAnalyzer.createDocument(file);

      expect(doc.classification).to.deep.include({
        type: 'attachment',
        context: 'supporting'
      });
    });
  });

  describe('relationship building', () => {
    it('should build PDF_WITH_RECORDS relationships', async () => {
      const files = [
        createTestFile('sample-email.txt'),
        createTestFile('sample-email-2.txt'),
        createTestFile('sample-records.json')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      const record = result.documents.records;

      // Each email should be linked to the record table
      result.documents.emails.forEach(email => {
        expect(email.relationships.companions).to.include(record.id);
      });

      // Record should have context from all emails
      result.documents.emails.forEach(email => {
        expect(record.relationships.context).to.include(email.id);
      });
    });

    it('should build PDF_WITH_OTHERS relationships', async () => {
      const files = [
        createTestFile('sample-email.txt'),
        createTestFile('sample-attachment.txt'),
        createTestFile('sample-attachment-2.txt')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      const email = result.documents.emails[0];

      // Each attachment should be linked to the email
      result.documents.others.forEach(attachment => {
        expect(attachment.relationships.context).to.include(email.id);
        expect(email.relationships.companions).to.include(attachment.id);
      });
    });
  });
});
