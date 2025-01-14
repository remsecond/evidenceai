const { expect } = require('chai');
const { ConversationProcessor } = require('../src/services/conversation-processor');
const { AttributionValidator } = require('../src/services/attribution-validator');
const { EvidenceChainBuilder } = require('../src/services/evidence-chain-builder');

describe('Attribution Accuracy Tests', () => {
  // Test data based on real Safeco payment scenario
  const testData = {
    messages: [
      {
        id: 'msg-1',
        timestamp: '2024-12-15T09:00:00Z',
        speaker: 'Christine',
        text: 'Safeco was not paid',
        type: 'claim',
        evidence: null
      },
      {
        id: 'msg-2',
        timestamp: '2024-12-15T10:30:00Z',
        speaker: 'Robert',
        text: 'Here is the payment confirmation',
        type: 'evidence',
        evidence: ['payment_screenshot.jpg'],
        references: ['msg-1']
      },
      {
        id: 'msg-3',
        timestamp: '2024-12-15T10:45:00Z',
        speaker: 'Robert',
        text: 'I am going to assume that this reply means you realize after all the screen captures and quotes I sent you, that your history on Safeco was wrong. I had paid, well in advance and far too much on Dec 10',
        type: 'response',
        references: ['msg-1', 'msg-2'],
        evidence_references: ['payment_screenshot.jpg']
      },
      {
        id: 'msg-4',
        timestamp: '2024-12-15T11:00:00Z',
        speaker: 'Christine',
        text: 'I see the payment confirmation',
        type: 'acknowledgment',
        references: ['msg-2', 'msg-3']
      },
      {
        id: 'msg-5',
        timestamp: '2024-12-16T09:00:00Z',
        speaker: 'Christine',
        text: 'Still no payment received',
        type: 'claim',
        references: ['msg-1'],
        ignores_evidence: ['msg-2', 'msg-3']
      }
    ],
    evidence: [
      {
        id: 'payment_screenshot.jpg',
        type: 'image',
        provider: 'Robert',
        timestamp: '2024-12-10T14:20:00Z',
        content: {
          type: 'payment_confirmation',
          amount: 'XXX.XX',
          recipient: 'Safeco',
          date: '2024-12-10'
        },
        verification: {
          status: 'verified',
          method: 'visual',
          confidence: 0.95
        }
      }
    ]
  };

  describe('Conversation Processing', () => {
    let processor;
    let validator;
    let chainBuilder;

    beforeEach(() => {
      processor = new ConversationProcessor();
      validator = new AttributionValidator();
      chainBuilder = new EvidenceChainBuilder();
    });

    it('should maintain correct speaker attribution', async () => {
      const processed = await processor.process(testData);

      // Test critical quote attribution
      const criticalQuote = processed.findQuote(
        'I am going to assume that this reply means you realize'
      );
      expect(criticalQuote.speaker).to.equal('Robert');
      expect(criticalQuote.type).to.equal('response');
      expect(criticalQuote.context.evidence_provided).to.be.true;
    });

    it('should track evidence ownership correctly', async () => {
      const processed = await processor.process(testData);
      const evidence = processed.findEvidence('payment_screenshot.jpg');

      expect(evidence.provider).to.equal('Robert');
      expect(evidence.verification.status).to.equal('verified');
      expect(evidence.references).to.include('msg-2');
    });

    it('should maintain conversation flow', async () => {
      const processed = await processor.process(testData);
      const flow = processed.getConversationFlow();

      expect(flow[0].speaker).to.equal('Christine');
      expect(flow[0].type).to.equal('claim');
      expect(flow[1].speaker).to.equal('Robert');
      expect(flow[1].type).to.equal('evidence');
    });

    it('should detect behavioral patterns', async () => {
      const processed = await processor.process(testData);
      const patterns = processed.getPatterns();

      const acknowledgmentPattern = patterns.find(
        p => p.type === 'acknowledge_then_deny'
      );
      expect(acknowledgmentPattern.speaker).to.equal('Christine');
      expect(acknowledgmentPattern.instances).to.have.length(1);
    });
  });

  describe('Evidence Chain Building', () => {
    it('should build complete evidence chains', async () => {
      const chain = await chainBuilder.buildChain(testData);

      expect(chain.claim.text).to.equal('Safeco was not paid');
      expect(chain.evidence.primary.provider).to.equal('Robert');
      expect(chain.verification.status).to.equal('verified');
    });

    it('should track evidence acknowledgment', async () => {
      const chain = await chainBuilder.buildChain(testData);
      const acknowledgment = chain.acknowledgments[0];

      expect(acknowledgment.speaker).to.equal('Christine');
      expect(acknowledgment.type).to.equal('explicit');
      expect(acknowledgment.followed_by_denial).to.be.true;
    });
  });

  describe('Attribution Validation', () => {
    it('should validate speaker attribution', async () => {
      const processed = await processor.process(testData);
      const validation = await validator.validateAttribution(processed);

      expect(validation.valid).to.be.true;
      expect(validation.confidence).to.be.above(0.95);
      expect(validation.issues).to.have.length(0);
    });

    it('should detect attribution errors', async () => {
      // Deliberately introduce an attribution error
      const badData = JSON.parse(JSON.stringify(testData));
      badData.messages[2].speaker = 'Christine'; // Wrong attribution

      const processed = await processor.process(badData);
      const validation = await validator.validateAttribution(processed);

      expect(validation.valid).to.be.false;
      expect(validation.issues).to.have.length.above(0);
      expect(validation.issues[0].type).to.equal('speaker_mismatch');
    });
  });

  describe('LLM Integration', () => {
    it('should generate attribution-safe prompts', async () => {
      const processed = await processor.process(testData);
      const prompt = processed.generateLLMPrompt();

      expect(prompt).to.include('SPEAKER ROLES:');
      expect(prompt).to.include('MESSAGE SEQUENCE:');
      expect(prompt).to.include('CRITICAL INSTRUCTIONS:');
    });

    it('should validate LLM output', async () => {
      const processed = await processor.process(testData);
      const llmOutput = {
        analysis: 'Robert provided evidence of payment...',
        quotes: [
          {
            text: 'I am going to assume...',
            speaker: 'Robert',
            context: 'evidence_response'
          }
        ]
      };

      const validation = await validator.validateLLMOutput(llmOutput, processed);
      expect(validation.valid).to.be.true;
      expect(validation.attributionAccurate).to.be.true;
    });
  });
});
