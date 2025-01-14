const { expect } = require('chai');
const { ConversationProcessor } = require('../src/services/conversation-processor');
const { AttributionValidator } = require('../src/services/attribution-validator');
const { EvidenceChainBuilder } = require('../src/services/evidence-chain-builder');

describe('Safeco Payment Scenario', () => {
  // Real test data based on actual conversation
  const testData = {
    messages: [
      {
        id: 'msg-1',
        timestamp: '2024-12-15T09:00:00Z',
        speaker: 'Christine',
        type: 'claim',
        text: 'Safeco was not paid',
        evidence: null
      },
      {
        id: 'msg-2',
        timestamp: '2024-12-15T10:30:00Z',
        speaker: 'Robert',
        type: 'evidence',
        text: 'Here is the payment confirmation',
        evidence: ['payment_screenshot.jpg'],
        references: ['msg-1']
      },
      {
        id: 'msg-3',
        timestamp: '2024-12-15T10:45:00Z',
        speaker: 'Robert',
        type: 'response',
        text: 'I am going to assume that this reply means you realize after all the screen captures and quotes I sent you, that your history on Safeco was wrong. I had paid, well in advance and far too much on Dec 10',
        references: ['msg-1', 'msg-2'],
        evidence_references: ['payment_screenshot.jpg']
      },
      {
        id: 'msg-4',
        timestamp: '2024-12-15T11:00:00Z',
        speaker: 'Christine',
        type: 'acknowledgment',
        text: 'I see the payment confirmation',
        references: ['msg-2', 'msg-3']
      },
      {
        id: 'msg-5',
        timestamp: '2024-12-16T09:00:00Z',
        speaker: 'Christine',
        type: 'claim',
        text: 'Still no payment received',
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

  let processor;
  let validator;
  let chainBuilder;
  let processedData;

  beforeEach(async () => {
    processor = new ConversationProcessor();
    validator = new AttributionValidator();
    chainBuilder = new EvidenceChainBuilder();
    processedData = await processor.process(testData);
  });

  describe('Speaker Attribution', () => {
    it('should correctly attribute the critical quote', () => {
      const quote = processor.findQuote(
        'I am going to assume that this reply means you realize'
      );
      expect(quote.speaker).to.equal('Robert');
      expect(quote.type).to.equal('response');
      expect(quote.context.evidence_provided).to.be.true;
    });

    it('should maintain speaker roles consistently', () => {
      const validation = validator.validateSpeakerConsistency(processedData);
      expect(validation.valid).to.be.true;
      expect(validation.confidence).to.be.above(0.9);
    });

    it('should detect acknowledgment followed by contradiction', () => {
      const patterns = processor.getPatterns();
      const acknowledgmentPattern = patterns.find(p => p.type === 'acknowledge_then_deny');
      expect(acknowledgmentPattern).to.exist;
      expect(acknowledgmentPattern.speaker).to.equal('Christine');
    });
  });

  describe('Evidence Chain', () => {
    let evidenceChain;

    beforeEach(async () => {
      evidenceChain = await chainBuilder.buildChain(testData);
    });

    it('should establish clear evidence ownership', () => {
      expect(evidenceChain.evidence.primary.provider).to.equal('Robert');
      expect(evidenceChain.evidence.primary.verification.status).to.equal('verified');
    });

    it('should track evidence acknowledgment', () => {
      const acknowledgment = evidenceChain.timeline.sequence.find(
        event => event.type === 'acknowledgment'
      );
      expect(acknowledgment.actor).to.equal('Christine');
      expect(acknowledgment.references).to.include('msg-2');
    });

    it('should detect pattern of ignoring evidence', () => {
      const patterns = evidenceChain.timeline.patterns;
      const contradictionPattern = patterns.find(p => 
        p.type === 'evidence_usage' && p.impact.contested
      );
      expect(contradictionPattern).to.exist;
      expect(contradictionPattern.evidence.id).to.equal('payment_screenshot.jpg');
    });
  });

  describe('Timeline Validation', () => {
    it('should verify temporal consistency', () => {
      const validation = validator.validateTemporalConsistency(processedData);
      expect(validation.valid).to.be.true;
      expect(validation.confidence).to.be.above(0.9);
    });

    it('should detect evidence preceding claims', () => {
      const timeline = processedData.flow;
      const paymentEvidence = timeline.find(e => e.id === 'payment_screenshot.jpg');
      const firstClaim = timeline.find(e => e.type === 'claim');
      expect(new Date(paymentEvidence.timestamp))
        .to.be.below(new Date(firstClaim.timestamp));
    });
  });

  describe('LLM Integration', () => {
    it('should generate attribution-safe prompts', () => {
      const prompt = processor.generateLLMPrompt();
      expect(prompt).to.include('SPEAKER ROLES:');
      expect(prompt).to.include('MESSAGE SEQUENCE:');
      expect(prompt).to.include('Robert (evidence_provider)');
      expect(prompt).to.include('Christine (claim_maker)');
    });

    it('should validate LLM output for attribution accuracy', async () => {
      const llmOutput = {
        analysis: 'Robert provided evidence of payment through screenshots...',
        quotes: [
          {
            text: 'I am going to assume...',
            speaker: 'Robert',
            context: 'evidence_response'
          }
        ]
      };

      const validation = await validator.validateLLMOutput(llmOutput, processedData);
      expect(validation.valid).to.be.true;
      expect(validation.attributionAccurate).to.be.true;
    });

    it('should detect misattributed quotes in LLM output', async () => {
      const badOutput = {
        analysis: 'Christine stated "I am going to assume..."',
        quotes: [
          {
            text: 'I am going to assume...',
            speaker: 'Christine', // Wrong attribution
            context: 'response'
          }
        ]
      };

      const validation = await validator.validateLLMOutput(badOutput, processedData);
      expect(validation.valid).to.be.false;
      expect(validation.attributionAccurate).to.be.false;
      expect(validation.issues[0].type).to.equal('misattributed_quote');
    });
  });

  describe('Behavioral Analysis', () => {
    it('should identify speaker patterns', () => {
      const patterns = processor.getPatterns();
      
      // Robert's pattern
      const robertPattern = patterns.find(p => 
        p.type === 'speaker_behavior' && p.speaker === 'Robert'
      );
      expect(robertPattern.behavior.evidence_based).to.be.true;
      expect(robertPattern.behavior.pattern).to.equal('evidence_focused');

      // Christine's pattern
      const christinePattern = patterns.find(p =>
        p.type === 'speaker_behavior' && p.speaker === 'Christine'
      );
      expect(christinePattern.behavior.pattern).to.equal('claim_only');
      expect(christinePattern.behavior.consistency).to.be.below(0.5);
    });

    it('should track evidence acknowledgment cycles', () => {
      const patterns = processor.getPatterns();
      const acknowledgmentPattern = patterns.find(p => 
        p.type === 'acknowledgment_pattern'
      );
      
      expect(acknowledgmentPattern.target).to.equal('msg-2'); // Evidence message
      expect(acknowledgmentPattern.followed_by_contradiction).to.be.true;
    });
  });

  describe('End-to-End Verification', () => {
    it('should produce verifiable factual summary', async () => {
      const chain = await chainBuilder.buildChain(testData);
      
      expect(chain.verification.status).to.equal('verified');
      expect(chain.verification.confidence).to.be.above(0.9);
      expect(chain.verification.methods).to.include('document_verification');
      
      // Timeline shows clear progression
      const timeline = chain.timeline.sequence;
      expect(timeline[0].type).to.equal('evidence'); // Payment made
      expect(timeline[1].type).to.equal('claim'); // Claim of non-payment
      expect(timeline[2].type).to.equal('evidence'); // Evidence presented
      expect(timeline[3].type).to.equal('acknowledgment'); // Evidence acknowledged
      expect(timeline[4].type).to.equal('claim'); // Contradictory claim
      
      // Behavioral patterns are clear
      const patterns = chain.timeline.patterns;
      expect(patterns.some(p => p.type === 'evidence_focused')).to.be.true;
      expect(patterns.some(p => p.type === 'acknowledge_then_deny')).to.be.true;
    });
  });
});
