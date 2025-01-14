import { expect } from 'chai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import DocumentEntity from '../src/models/document-entity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DocumentEntity', () => {
  const fixturesPath = path.join(__dirname, 'fixtures');
  
  // Helper to create a test file object
  const createTestFile = (filename) => ({
    path: path.join(fixturesPath, filename),
    originalname: filename
  });

  describe('constructor', () => {
    it('should create a document entity with basic properties', () => {
      const file = createTestFile('sample-email.txt');
      const doc = new DocumentEntity(file);

      expect(doc.id).to.be.a('string');
      expect(doc.originalName).to.equal(file.originalname);
      expect(doc.path).to.equal(file.path);
      expect(doc.relationships.companions).to.be.an('array').that.is.empty;
      expect(doc.relationships.context).to.be.an('array').that.is.empty;
    });

    it('should generate correct fingerprint', () => {
      const file = createTestFile('sample-email.txt');
      const doc = new DocumentEntity(file);

      expect(doc.fingerprint).to.have.property('contentHash').that.is.a('string');
      expect(doc.fingerprint).to.have.property('metadataHash').that.is.a('string');
      expect(doc.fingerprint).to.have.property('creationSignature').that.is.a('string');
      
      // Verify content hash is consistent
      const doc2 = new DocumentEntity(file);
      expect(doc2.fingerprint.contentHash).to.equal(doc.fingerprint.contentHash);
    });

    it('should classify document format correctly', () => {
      const file = createTestFile('sample-email.txt');
      const doc = new DocumentEntity(file);

      expect(doc.classification).to.deep.include({
        format: 'txt',
        type: null,
        context: null
      });
    });
  });

  describe('relationships', () => {
    it('should add companion relationships', () => {
      const doc = new DocumentEntity(createTestFile('sample-email.txt'));
      const companionId = 'test-companion-id';

      doc.addCompanion(companionId);
      expect(doc.relationships.companions).to.include(companionId);
      
      // Should not duplicate companions
      doc.addCompanion(companionId);
      expect(doc.relationships.companions).to.have.lengthOf(1);
    });

    it('should add context relationships', () => {
      const doc = new DocumentEntity(createTestFile('sample-email.txt'));
      const contextId = 'test-context-id';

      doc.addContext(contextId);
      expect(doc.relationships.context).to.include(contextId);
      
      // Should not duplicate context
      doc.addContext(contextId);
      expect(doc.relationships.context).to.have.lengthOf(1);
    });
  });

  describe('classification', () => {
    it('should update classification', () => {
      const doc = new DocumentEntity(createTestFile('sample-email.txt'));
      const newClassification = {
        type: 'email_pdf',
        context: 'email_content'
      };

      doc.updateClassification(newClassification);
      expect(doc.classification).to.deep.include(newClassification);
      expect(doc.classification.format).to.equal('txt'); // Original format preserved
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const doc = new DocumentEntity(createTestFile('sample-email.txt'));
      const json = doc.toJSON();

      expect(json).to.have.all.keys([
        'id',
        'originalName',
        'fingerprint',
        'classification',
        'relationships'
      ]);
      expect(json.fingerprint).to.have.all.keys([
        'contentHash',
        'metadataHash',
        'creationSignature'
      ]);
    });
  });
});
