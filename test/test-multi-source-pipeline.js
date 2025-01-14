const { expect } = require('chai');
const path = require('path');

describe('Multi-Source Pipeline Test', () => {
  const TEST_DATA_PATH = 'C:/Users/robmo/OneDrive/Documents/evidenceai_test/input/3_File_Nov_Jan_Test';
  
  const sources = {
    ofw: {
      path: path.join(TEST_DATA_PATH, 'OFW_Messages_Report_2025-01-12_09-01-06.pdf'),
      type: 'ofw_report',
      timestamp: '2025-01-12T09:01:06Z'
    },
    email: {
      path: path.join(TEST_DATA_PATH, 'Email exchange with christinemoyer_hotmail.com after 2024-10-31 before 2025-01-12.pdf'),
      type: 'email_thread',
      timestamp: '2025-01-12T09:26:00Z'
    },
    metadata: {
      path: path.join(TEST_DATA_PATH, 'label Emails from christinemoyer@hotmail.com after 2024-10-31 before 2025-01-12.ods'),
      type: 'email_metadata',
      timestamp: '2025-01-12T09:37:00Z'
    },
    attachments: path.join(TEST_DATA_PATH, 'Attachments')
  };

  describe('Source Availability Tests', () => {
    it('should verify all source files exist', async () => {
      const fs = require('fs').promises;
      
      // Check main sources
      for (const [key, source] of Object.entries(sources)) {
        if (key !== 'attachments') {
          const exists = await fs.access(source.path)
            .then(() => true)
            .catch(() => false);
          expect(exists, `${key} source file should exist`).to.be.true;
        }
      }

      // Check attachments directory
      const attachmentsExists = await fs.access(sources.attachments)
        .then(() => true)
        .catch(() => false);
      expect(attachmentsExists, 'Attachments directory should exist').to.be.true;
    });

    it('should list available attachments', async () => {
      const fs = require('fs').promises;
      const attachments = await fs.readdir(sources.attachments);
      expect(attachments.length).to.be.above(0);
      
      // Log attachment types for analysis
      const types = new Map();
      attachments.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        types.set(ext, (types.get(ext) || 0) + 1);
      });
      console.log('Attachment types:', Object.fromEntries(types));
    });
  });

  describe('Source Processing Tests', () => {
    let processor;

    beforeEach(() => {
      // Initialize processor for each test
      processor = new UniversalProcessor({
        extractors: {
          pdf: new PDFExtractor(),
          ods: new ODSExtractor(),
          attachments: new AttachmentProcessor()
        },
        validators: {
          temporal: new TemporalValidator(),
          content: new ContentValidator(),
          reference: new ReferenceValidator()
        }
      });
    });

    it('should process OFW source', async () => {
      const result = await processor.processSource(sources.ofw);
      expect(result.success).to.be.true;
      expect(result.messages).to.be.an('array');
      expect(result.metadata).to.include.keys(['timeframe', 'participants']);
    });

    it('should process Email PDF source', async () => {
      const result = await processor.processSource(sources.email);
      expect(result.success).to.be.true;
      expect(result.messages).to.be.an('array');
      expect(result.metadata).to.include.keys(['timeframe', 'participants']);
    });

    it('should process Email ODS metadata', async () => {
      const result = await processor.processSource(sources.metadata);
      expect(result.success).to.be.true;
      expect(result.entries).to.be.an('array');
      expect(result.metadata).to.include.keys(['timeframe', 'fields']);
    });

    it('should process attachments', async () => {
      const result = await processor.processAttachments(sources.attachments);
      expect(result.success).to.be.true;
      expect(result.processed).to.be.an('array');
      expect(result.metadata).to.include.keys(['types', 'count']);
    });
  });

  describe('Cross-Source Integration Tests', () => {
    it('should match email references across sources', async () => {
      const emailResult = await processor.processSource(sources.email);
      const odsResult = await processor.processSource(sources.metadata);
      
      const matches = await processor.matchReferences(emailResult, odsResult);
      expect(matches.length).to.be.above(0);
      expect(matches[0]).to.include.keys(['email', 'metadata']);
    });

    it('should link attachments to source messages', async () => {
      const emailResult = await processor.processSource(sources.email);
      const attachmentsResult = await processor.processAttachments(sources.attachments);
      
      const links = await processor.linkAttachments(emailResult, attachmentsResult);
      expect(links.length).to.be.above(0);
      expect(links[0]).to.include.keys(['message', 'attachment']);
    });

    it('should verify temporal consistency across sources', async () => {
      const results = await Promise.all([
        processor.processSource(sources.ofw),
        processor.processSource(sources.email),
        processor.processSource(sources.metadata)
      ]);

      const timeline = await processor.buildTimeline(results);
      expect(timeline.valid).to.be.true;
      expect(timeline.events).to.be.an('array');
      expect(timeline.gaps).to.be.an('array');
    });
  });

  describe('Content Verification Tests', () => {
    it('should cross-validate claims across sources', async () => {
      const results = await processor.processAll(sources);
      const claims = await processor.extractClaims(results);
      
      // Check for claims that appear in multiple sources
      const crossValidated = claims.filter(claim => claim.sources.length > 1);
      expect(crossValidated.length).to.be.above(0);
      
      // Verify claim consistency
      crossValidated.forEach(claim => {
        expect(claim.consistency).to.be.above(0.8);
        expect(claim.verification.status).to.equal('verified');
      });
    });

    it('should detect and resolve conflicts between sources', async () => {
      const results = await processor.processAll(sources);
      const conflicts = await processor.detectConflicts(results);
      
      conflicts.forEach(conflict => {
        expect(conflict).to.include.keys(['type', 'sources', 'resolution']);
        expect(conflict.resolution).to.include.keys(['status', 'evidence']);
      });
    });

    it('should maintain attachment context across sources', async () => {
      const results = await processor.processAll(sources);
      const attachmentRefs = await processor.extractAttachmentReferences(results);
      
      attachmentRefs.forEach(ref => {
        expect(ref.mentions).to.be.an('array');
        expect(ref.confirmations).to.be.an('array');
        expect(ref.context).to.include.keys(['before', 'after']);
      });
    });
  });

  describe('End-to-End Pipeline Test', () => {
    it('should process all sources and generate unified output', async () => {
      const output = await processor.processAll({
        sources: [
          {
            type: 'ofw',
            path: sources.ofw.path,
            metadata: {
              type: sources.ofw.type,
              timestamp: sources.ofw.timestamp
            }
          },
          {
            type: 'email',
            path: sources.email.path,
            metadata: {
              type: sources.email.type,
              timestamp: sources.email.timestamp
            }
          },
          {
            type: 'metadata',
            path: sources.metadata.path,
            metadata: {
              type: sources.metadata.type,
              timestamp: sources.metadata.timestamp
            }
          }
        ],
        attachments: {
          path: sources.attachments
        }
      });

      // Verify output structure
      expect(output).to.include.keys([
        'metadata',
        'content',
        'timeline',
        'relationships',
        'verification'
      ]);

      // Check source integration
      expect(output.metadata.sources).to.include.keys(['ofw', 'email', 'metadata']);
      expect(output.metadata.timeframe).to.include.keys(['start', 'end']);
      expect(output.metadata.confidence).to.be.above(0.8);

      // Verify content processing
      expect(output.content.messages).to.be.an('array');
      expect(output.content.attachments).to.be.an('array');
      expect(output.content.relationships).to.be.an('array');

      // Check timeline construction
      expect(output.timeline.events).to.be.an('array');
      expect(output.timeline.patterns).to.be.an('array');
      expect(output.timeline.confidence).to.be.above(0.8);

      // Verify relationship mapping
      expect(output.relationships.data).to.be.an('array');
      expect(output.relationships.patterns).to.be.an('array');
      expect(output.relationships.confidence).to.be.above(0.8);

      // Check verification results
      expect(output.verification.status).to.equal('verified');
      expect(output.verification.confidence).to.be.above(0.8);
      expect(output.verification.methods).to.be.an('array');
    });
  });
});
