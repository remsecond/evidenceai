import { expect } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import packageAnalyzer from '../src/services/package-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PackageAnalyzer', () => {
  const fixturesPath = path.join(__dirname, 'fixtures');

  // Helper function to create file objects like multer provides
  const createFileObject = (filename) => ({
    path: path.join(fixturesPath, filename),
    originalname: filename
  });

  describe('analyzeUpload()', () => {
    it('should detect PDF_ONLY package', async () => {
      const files = [
        createFileObject('sample-email-1.pdf'),
        createFileObject('sample-email-2.pdf')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      
      expect(result.type).to.equal('PDF_ONLY');
      expect(result.files.emails).to.have.lengthOf(2);
      expect(result.files.records).to.be.null;
      expect(result.files.others).to.have.lengthOf(0);
    });

    it('should detect PDF_WITH_RECORDS package', async () => {
      const files = [
        createFileObject('sample-email-1.pdf'),
        createFileObject('sample-records.ods')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      
      expect(result.type).to.equal('PDF_WITH_RECORDS');
      expect(result.files.emails).to.have.lengthOf(1);
      expect(result.files.records).to.not.be.null;
      expect(result.files.others).to.have.lengthOf(0);
    });

    it('should detect PDF_WITH_OTHERS package', async () => {
      const files = [
        createFileObject('sample-email-1.pdf'),
        createFileObject('attachment.pdf')
      ];

      const result = await packageAnalyzer.analyzeUpload(files);
      
      expect(result.type).to.equal('PDF_WITH_OTHERS');
      expect(result.files.emails).to.have.lengthOf(1);
      expect(result.files.records).to.be.null;
      expect(result.files.others).to.have.lengthOf(1);
    });
  });

  describe('isEmailPdf()', () => {
    it('should detect email PDF by markers', async () => {
      const filePath = path.join(fixturesPath, 'sample-email.txt');
      const isEmail = await packageAnalyzer.isEmailPdf(filePath);
      expect(isEmail).to.be.true;
    });

    it('should reject non-email PDF', async () => {
      const filePath = path.join(fixturesPath, 'sample-attachment.txt');
      const isEmail = await packageAnalyzer.isEmailPdf(filePath);
      expect(isEmail).to.be.false;
    });
  });

  describe('isRecordTable()', () => {
    it('should detect record table by headers', async () => {
      const filePath = path.join(fixturesPath, 'sample-records.ods');
      const isRecordTable = await packageAnalyzer.isRecordTable(filePath);
      expect(isRecordTable).to.be.true;
    });

    it('should reject non-record spreadsheet', async () => {
      const filePath = path.join(fixturesPath, 'sample-spreadsheet.ods');
      const isRecordTable = await packageAnalyzer.isRecordTable(filePath);
      expect(isRecordTable).to.be.false;
    });
  });
});
