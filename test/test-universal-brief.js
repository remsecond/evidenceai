const UniversalBrief = require('../src/schemas/universal-brief-schema');

describe('UniversalBrief', () => {
  describe('Source Combinations', () => {
    // Single Source Tests
    test('OFW Only', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('ofw', true, 5);
      
      brief.addMessage({
        id: 'ofw-1',
        timestamp: '2024-01-01T10:00:00Z',
        content: 'Initial message from OFW',
        source: 'ofw',
        confidence: 0.8
      });

      brief.addTimelineEvent({
        timestamp: '2024-01-01T10:00:00Z',
        description: 'Communication initiated',
        sources: ['ofw'],
        confidence: 0.8
      });

      const result = brief.validate();
      expect(result.valid).toBe(true);
      expect(brief.metadata.confidence.overall).toBeGreaterThan(0);
      expect(brief.generatePrompt()).toContain('Available Sources: OFW');
    });

    test('Email Only', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('email', true, 3);
      
      brief.addMessage({
        id: 'email-1',
        timestamp: '2024-01-01T10:00:00Z',
        content: 'Email correspondence',
        source: 'email',
        confidence: 0.9,
        attachments: {
          present: true,
          count: 1,
          details: [{ name: 'doc.pdf', type: 'application/pdf' }]
        }
      });

      const result = brief.validate();
      expect(result.valid).toBe(true);
      expect(brief.metadata.confidence.overall).toBeGreaterThan(0);
      expect(brief.generatePrompt()).toContain('Available Sources: EMAIL');
    });

    test('Table Only', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('table', true, 10);
      
      brief.addMessage({
        id: 'table-1',
        timestamp: '2024-01-01T10:00:00Z',
        content: 'Structured data entry',
        source: 'table',
        confidence: 0.95,
        metadata: {
          present: true,
          fields: { category: 'meeting', priority: 'high' }
        }
      });

      const result = brief.validate();
      expect(result.valid).toBe(true);
      expect(brief.metadata.confidence.overall).toBeGreaterThan(0);
      expect(brief.generatePrompt()).toContain('Available Sources: TABLE');
    });

    // Dual Source Tests
    test('OFW + Email', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('ofw', true, 2);
      brief.setSourceAvailability('email', true, 3);
      
      brief.addMessage({
        id: 'ofw-1',
        timestamp: '2024-01-01T10:00:00Z',
        content: 'OFW message',
        source: 'ofw',
        confidence: 0.8
      });

      brief.addMessage({
        id: 'email-1',
        timestamp: '2024-01-01T10:30:00Z',
        content: 'Related email',
        source: 'email',
        confidence: 0.9
      });

      brief.addRelationship({
        type: 'thread',
        entities: ['ofw-1', 'email-1'],
        confidence: 0.85
      });

      const result = brief.validate();
      expect(result.valid).toBe(true);
      expect(brief.metadata.confidence.overall).toBeGreaterThan(0.6);
      expect(brief.generatePrompt()).toContain('Available Sources: OFW, EMAIL');
    });

    // Complete Set Test
    test('All Sources', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('ofw', true, 2);
      brief.setSourceAvailability('email', true, 3);
      brief.setSourceAvailability('table', true, 5);
      
      brief.addMessage({
        id: 'ofw-1',
        timestamp: '2024-01-01T10:00:00Z',
        content: 'OFW message',
        source: 'ofw',
        confidence: 0.8
      });

      brief.addMessage({
        id: 'email-1',
        timestamp: '2024-01-01T10:30:00Z',
        content: 'Related email',
        source: 'email',
        confidence: 0.9
      });

      brief.addMessage({
        id: 'table-1',
        timestamp: '2024-01-01T11:00:00Z',
        content: 'Structured data',
        source: 'table',
        confidence: 0.95
      });

      brief.addTimelineEvent({
        timestamp: '2024-01-01T10:00:00Z',
        description: 'Communication thread started',
        sources: ['ofw', 'email', 'table'],
        confidence: 0.9
      });

      brief.addRelationship({
        type: 'thread',
        entities: ['ofw-1', 'email-1', 'table-1'],
        confidence: 0.85
      });

      brief.setAnalysis({
        summary: 'Complete communication thread with cross-source validation',
        keyPoints: [
          'Initial OFW message received',
          'Email follow-up confirmed',
          'Data recorded in structured format'
        ],
        confidence: 0.9
      });

      const result = brief.validate();
      expect(result.valid).toBe(true);
      expect(brief.metadata.confidence.overall).toBeGreaterThan(0.8);
      expect(brief.generatePrompt()).toContain('Available Sources: OFW, EMAIL, TABLE');
    });
  });

  describe('LLM Integration', () => {
    test('Generates appropriate prompts for partial data', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('ofw', true, 2);
      
      brief.addMessage({
        id: 'ofw-1',
        timestamp: '2024-01-01T10:00:00Z',
        content: 'Single source message',
        source: 'ofw',
        confidence: 0.8
      });

      const prompt = brief.generatePrompt();
      expect(prompt).toContain('Available Sources: OFW');
      expect(prompt).toContain('Consider:');
      expect(prompt).toContain('Overall Confidence:');
      expect(prompt).toMatch(/Confidence: \d+\.\d+%/);
    });

    test('Handles missing data gracefully', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('email', true, 0);
      
      const result = brief.validate();
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No messages present');
      
      const prompt = brief.generatePrompt();
      expect(prompt).toContain('Available Sources: EMAIL');
      expect(brief.content.analysis.summary).toContain('insufficient data');
    });
  });

  describe('Confidence Scoring', () => {
    test('Adjusts confidence based on available sources', () => {
      const brief = new UniversalBrief();
      
      // Single source
      brief.setSourceAvailability('ofw', true, 1);
      let singleSourceConfidence = brief.metadata.confidence.overall;
      
      // Add second source
      brief.setSourceAvailability('email', true, 1);
      let dualSourceConfidence = brief.metadata.confidence.overall;
      
      // Add third source
      brief.setSourceAvailability('table', true, 1);
      let fullSourceConfidence = brief.metadata.confidence.overall;
      
      expect(fullSourceConfidence).toBeGreaterThan(dualSourceConfidence);
      expect(dualSourceConfidence).toBeGreaterThan(singleSourceConfidence);
    });

    test('Weights different types of confidence', () => {
      const brief = new UniversalBrief();
      brief.setSourceAvailability('ofw', true, 2);
      brief.setSourceAvailability('email', true, 2);
      
      brief.addMessage({
        id: 'msg-1',
        timestamp: '2024-01-01T10:00:00Z',
        content: 'High confidence message',
        source: 'ofw',
        confidence: 0.9
      });

      brief.addTimelineEvent({
        timestamp: '2024-01-01T10:00:00Z',
        description: 'High confidence event',
        sources: ['ofw'],
        confidence: 0.9
      });

      expect(brief.metadata.confidence.temporal).toBeGreaterThan(0.8);
      expect(brief.metadata.confidence.contextual).toBeGreaterThan(0);
      expect(brief.metadata.confidence.overall).toBeGreaterThan(0);
    });
  });
});
