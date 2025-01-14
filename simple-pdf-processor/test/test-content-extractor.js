import { expect } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentEntity from '../src/models/document-entity.js';
import contentExtractor from '../src/services/content-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ContentExtractor', () => {
  const fixturesPath = path.join(__dirname, 'fixtures');
  
  // Helper to create test file object
  const createTestFile = (filename) => ({
    path: path.join(fixturesPath, filename),
    originalname: filename
  });

  describe('extractEmailFields()', () => {
    it('should extract fields from email content', () => {
      const content = `
From: sender@example.com
To: recipient@example.com
Subject: Test Email Subject
Date: Thu, 11 Jan 2024 10:00:00 -0800

Email body content here
`;
      const fields = contentExtractor.extractEmailFields(content);

      expect(fields).to.have.all.keys(['subject', 'from', 'to', 'date']);
      expect(fields.subject).to.equal('Test Email Subject');
      expect(fields.from).to.equal('sender@example.com');
      expect(fields.to).to.equal('recipient@example.com');
      expect(fields.date).to.be.instanceOf(Date);
    });

    it('should handle missing fields gracefully', () => {
      const content = 'Some content without email headers';
      const fields = contentExtractor.extractEmailFields(content);

      expect(fields).to.have.all.keys(['subject', 'from', 'to', 'date']);
      expect(fields.subject).to.equal('');
      expect(fields.from).to.equal('');
      expect(fields.to).to.equal('');
      expect(fields.date).to.be.null;
    });

    it('should normalize email addresses', () => {
      const content = `
From: John Smith <john.smith@example.com>
To: Jane Doe <jane.doe@example.com>
Subject: Test
Date: Thu, 11 Jan 2024 10:00:00 -0800
`;
      const fields = contentExtractor.extractEmailFields(content);

      expect(fields.from).to.equal('john.smith@example.com');
      expect(fields.to).to.equal('jane.doe@example.com');
    });
  });

  describe('extractRecordFields()', () => {
    it('should extract fields from record content', () => {
      const content = `
Thread ID,Message ID,From,To,Subject,Date
123,456,sender@example.com,recipient@example.com,Test Subject,2024-01-11T10:00:00Z
`;
      const fields = contentExtractor.extractRecordFields(content);

      expect(fields).to.have.all.keys(['subject', 'from', 'to', 'date']);
      expect(fields.subject).to.equal('Test Subject');
      expect(fields.from).to.equal('sender@example.com');
      expect(fields.to).to.equal('recipient@example.com');
      expect(fields.date).to.be.instanceOf(Date);
    });

    it('should handle missing or invalid record data', () => {
      const content = 'Invalid record content';
      const fields = contentExtractor.extractRecordFields(content);

      expect(fields).to.be.null;
    });

    it('should handle TSV format', () => {
      const content = `
Thread ID\tMessage ID\tFrom\tTo\tSubject\tDate
123\t456\tsender@example.com\trecipient@example.com\tTest Subject\t2024-01-11T10:00:00Z
`;
      const fields = contentExtractor.extractRecordFields(content);

      expect(fields).to.not.be.null;
      expect(fields.subject).to.equal('Test Subject');
    });
  });

  describe('extractContent()', () => {
    it('should extract content from email document', async () => {
      const file = createTestFile('sample-email.txt');
      const doc = new DocumentEntity(file);
      doc.updateClassification({ type: 'email_pdf', context: 'email_content' });

      const content = await contentExtractor.extractContent(doc);
      expect(content).to.be.a('string');
      expect(content).to.not.be.empty;
    });

    it('should extract content from record document', async () => {
      const file = createTestFile('sample-records.json');
      const doc = new DocumentEntity(file);
      doc.updateClassification({ type: 'record_table', context: 'metadata' });

      const content = await contentExtractor.extractContent(doc);
      expect(content).to.be.a('string');
      expect(content).to.not.be.empty;
    });

    it('should extract content from attachment document', async () => {
      const file = createTestFile('sample-attachment.txt');
      const doc = new DocumentEntity(file);
      doc.updateClassification({ type: 'attachment', context: 'supporting' });

      const content = await contentExtractor.extractContent(doc);
      expect(content).to.be.a('string');
      expect(content).to.equal(file.originalname);
    });
  });

  describe('content cleaning', () => {
    it('should normalize whitespace', () => {
      const content = 'This   has \n\n extra  \t whitespace';
      const cleaned = contentExtractor.cleanContent(content);
      expect(cleaned).to.equal('this has extra whitespace');
    });

    it('should preserve email-related characters', () => {
      const content = 'Email: test.user@example.com';
      const cleaned = contentExtractor.cleanContent(content);
      expect(cleaned).to.include('@');
      expect(cleaned).to.include('.');
    });

    it('should remove special characters', () => {
      const content = 'Special #$%^&* chars!';
      const cleaned = contentExtractor.cleanContent(content);
      expect(cleaned).to.equal('special chars');
    });
  });

  describe('email normalization', () => {
    it('should extract email from display format', () => {
      const email = 'John Smith <john.smith@example.com>';
      const normalized = contentExtractor.normalizeEmailAddress(email);
      expect(normalized).to.equal('john.smith@example.com');
    });

    it('should handle plain email addresses', () => {
      const email = 'john.smith@example.com';
      const normalized = contentExtractor.normalizeEmailAddress(email);
      expect(normalized).to.equal('john.smith@example.com');
    });

    it('should convert to lowercase', () => {
      const email = 'John.Smith@Example.com';
      const normalized = contentExtractor.normalizeEmailAddress(email);
      expect(normalized).to.equal('john.smith@example.com');
    });
  });
});
