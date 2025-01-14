const { v4: uuidv4 } = require('uuid');

class ConversationProcessor {
  constructor() {
    this.conversations = new Map();
    this.evidence = new Map();
    this.patterns = new Map();
  }

  async process(data) {
    const conversationId = uuidv4();
    const processed = {
      id: conversationId,
      metadata: this.processMetadata(data),
      messages: await this.processMessages(data.messages),
      evidence: await this.processEvidence(data.evidence),
      patterns: await this.detectPatterns(data.messages),
      flow: this.buildConversationFlow(data.messages)
    };

    this.conversations.set(conversationId, processed);
    return processed;
  }

  processMetadata(data) {
    const timestamps = data.messages.map(m => new Date(m.timestamp));
    return {
      timeframe: {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps))
      },
      participants: this.extractParticipants(data.messages),
      topics: this.extractTopics(data.messages)
    };
  }

  async processMessages(messages) {
    return messages.map(message => ({
      id: message.id,
      timestamp: new Date(message.timestamp),
      speaker: {
        id: this.normalizeSpeakerId(message.speaker),
        name: message.speaker,
        role: this.determineRole(message)
      },
      content: {
        text: message.text,
        type: message.type,
        evidence: message.evidence || []
      },
      context: {
        references: message.references || [],
        evidence_references: message.evidence_references || [],
        ignores_evidence: message.ignores_evidence || []
      },
      verification: {
        speaker_confidence: this.calculateSpeakerConfidence(message),
        content_confidence: this.calculateContentConfidence(message),
        context_confidence: this.calculateContextConfidence(message)
      }
    }));
  }

  async processEvidence(evidence) {
    return evidence.map(item => ({
      id: item.id,
      type: item.type,
      provider: {
        id: this.normalizeSpeakerId(item.provider),
        name: item.provider,
        role: 'evidence_provider'
      },
      content: item.content,
      verification: item.verification,
      references: new Set(),  // Messages referencing this evidence
      acknowledgments: new Set() // Messages acknowledging this evidence
    }));
  }

  async detectPatterns(messages) {
    const patterns = [];

    // Track claim-evidence patterns
    const claimResponses = this.trackClaimResponses(messages);
    patterns.push(...claimResponses);

    // Track acknowledgment patterns
    const acknowledgmentPatterns = this.trackAcknowledgments(messages);
    patterns.push(...acknowledgmentPatterns);

    // Track behavioral patterns
    const behavioralPatterns = this.trackBehavioralPatterns(messages);
    patterns.push(...behavioralPatterns);

    return patterns;
  }

  buildConversationFlow(messages) {
    const flow = [];
    const messageMap = new Map(messages.map(m => [m.id, m]));

    // Build reply chains
    messages.forEach(message => {
      const node = {
        id: message.id,
        timestamp: new Date(message.timestamp),
        speaker: message.speaker,
        type: message.type,
        references: new Set()
      };

      // Add reference connections
      if (message.references) {
        message.references.forEach(refId => {
          const refMessage = messageMap.get(refId);
          if (refMessage) {
            node.references.add({
              id: refId,
              type: 'reply_to',
              timestamp: new Date(refMessage.timestamp)
            });
          }
        });
      }

      flow.push(node);
    });

    // Sort by timestamp
    flow.sort((a, b) => a.timestamp - b.timestamp);

    return flow;
  }

  // Helper methods
  normalizeSpeakerId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  determineRole(message) {
    if (message.type === 'claim') return 'claim_maker';
    if (message.type === 'evidence') return 'evidence_provider';
    if (message.type === 'acknowledgment') return 'responder';
    return 'participant';
  }

  calculateSpeakerConfidence(message) {
    // Direct messages have high confidence
    if (message.type === 'claim' || message.type === 'evidence') return 1.0;
    // Replies maintain context
    if (message.references && message.references.length > 0) return 0.95;
    return 0.8;
  }

  calculateContentConfidence(message) {
    // Evidence-backed content has high confidence
    if (message.evidence && message.evidence.length > 0) return 1.0;
    // Claims need verification
    if (message.type === 'claim') return 0.7;
    return 0.8;
  }

  calculateContextConfidence(message) {
    // Messages with clear references have high context confidence
    if (message.references && message.references.length > 0) return 0.95;
    // Standalone messages have lower context confidence
    return 0.7;
  }

  extractParticipants(messages) {
    const participants = new Map();

    messages.forEach(message => {
      const id = this.normalizeSpeakerId(message.speaker);
      if (!participants.has(id)) {
        participants.set(id, {
          id,
          name: message.speaker,
          roles: new Set(),
          claims: [],
          evidence: [],
          patterns: []
        });
      }

      const participant = participants.get(id);
      participant.roles.add(this.determineRole(message));

      if (message.type === 'claim') {
        participant.claims.push({
          id: message.id,
          text: message.text,
          timestamp: new Date(message.timestamp)
        });
      }

      if (message.evidence) {
        participant.evidence.push(...message.evidence);
      }
    });

    return Array.from(participants.values());
  }

  extractTopics(messages) {
    // Simple topic extraction based on claims and evidence
    const topics = new Set();
    
    messages.forEach(message => {
      if (message.type === 'claim') {
        // Extract key terms from claims
        const terms = message.text.toLowerCase().split(/\W+/);
        terms.forEach(term => {
          if (term.length > 3) topics.add(term);
        });
      }
    });

    return Array.from(topics);
  }

  trackClaimResponses(messages) {
    const patterns = [];
    const claims = new Map();

    messages.forEach(message => {
      if (message.type === 'claim') {
        claims.set(message.id, {
          claim: message,
          responses: []
        });
      }

      if (message.references) {
        message.references.forEach(refId => {
          if (claims.has(refId)) {
            claims.get(refId).responses.push(message);
          }
        });
      }
    });

    claims.forEach(({claim, responses}) => {
      if (responses.length > 0) {
        patterns.push({
          type: 'claim_response',
          claim: claim.id,
          responses: responses.map(r => r.id),
          resolution: this.determineResolution(claim, responses)
        });
      }
    });

    return patterns;
  }

  trackAcknowledgments(messages) {
    const patterns = [];
    const acknowledgments = new Map();

    messages.forEach(message => {
      if (message.type === 'acknowledgment') {
        message.references.forEach(refId => {
          if (!acknowledgments.has(refId)) {
            acknowledgments.set(refId, []);
          }
          acknowledgments.get(refId).push(message);
        });
      }
    });

    acknowledgments.forEach((acks, targetId) => {
      if (acks.length > 0) {
        patterns.push({
          type: 'acknowledgment_pattern',
          target: targetId,
          acknowledgments: acks.map(a => a.id),
          followed_by_contradiction: this.hasContradiction(acks)
        });
      }
    });

    return patterns;
  }

  trackBehavioralPatterns(messages) {
    const patterns = [];
    const speakerBehavior = new Map();

    messages.forEach(message => {
      const speaker = message.speaker;
      if (!speakerBehavior.has(speaker)) {
        speakerBehavior.set(speaker, {
          claims: [],
          evidence: [],
          acknowledgments: [],
          contradictions: []
        });
      }

      const behavior = speakerBehavior.get(speaker);
      
      switch (message.type) {
        case 'claim':
          behavior.claims.push(message);
          break;
        case 'evidence':
          behavior.evidence.push(message);
          break;
        case 'acknowledgment':
          behavior.acknowledgments.push(message);
          break;
      }

      // Check for contradictions
      if (message.ignores_evidence) {
        behavior.contradictions.push(message);
      }
    });

    speakerBehavior.forEach((behavior, speaker) => {
      // Detect evidence-based behavior
      if (behavior.evidence.length > 0) {
        patterns.push({
          type: 'evidence_provider',
          speaker,
          instances: behavior.evidence.length,
          confidence: 1.0
        });
      }

      // Detect acknowledgment followed by contradiction
      if (behavior.acknowledgments.length > 0 && behavior.contradictions.length > 0) {
        patterns.push({
          type: 'acknowledge_then_deny',
          speaker,
          instances: Math.min(behavior.acknowledgments.length, behavior.contradictions.length),
          confidence: 0.9
        });
      }
    });

    return patterns;
  }

  determineResolution(claim, responses) {
    const evidenceResponses = responses.filter(r => r.evidence && r.evidence.length > 0);
    const acknowledgments = responses.filter(r => r.type === 'acknowledgment');
    
    if (evidenceResponses.length > 0 && acknowledgments.length > 0) {
      return {
        status: 'verified',
        confidence: 0.95,
        evidence: evidenceResponses.map(r => r.evidence).flat()
      };
    }

    if (evidenceResponses.length > 0) {
      return {
        status: 'evidence_provided',
        confidence: 0.9,
        evidence: evidenceResponses.map(r => r.evidence).flat()
      };
    }

    return {
      status: 'unresolved',
      confidence: 0.5,
      evidence: []
    };
  }

  hasContradiction(acknowledgments) {
    // Sort by timestamp
    const sorted = acknowledgments.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Look for contradictions after acknowledgments
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.type === 'acknowledgment' && 
          next.ignores_evidence && 
          next.ignores_evidence.includes(current.references[0])) {
        return true;
      }
    }

    return false;
  }

  // Public query methods
  findQuote(text) {
    for (const conversation of this.conversations.values()) {
      for (const message of conversation.messages) {
        if (message.content.text.includes(text)) {
          return {
            speaker: message.speaker.name,
            type: message.content.type,
            context: {
              evidence_provided: message.content.evidence.length > 0,
              references: message.context.references,
              verification: message.verification
            }
          };
        }
      }
    }
    return null;
  }

  findEvidence(id) {
    for (const conversation of this.conversations.values()) {
      const evidence = conversation.evidence.find(e => e.id === id);
      if (evidence) return evidence;
    }
    return null;
  }

  getConversationFlow(conversationId) {
    const conversation = conversationId ? 
      this.conversations.get(conversationId) :
      Array.from(this.conversations.values())[0];

    return conversation ? conversation.flow : [];
  }

  getPatterns(conversationId) {
    const conversation = conversationId ?
      this.conversations.get(conversationId) :
      Array.from(this.conversations.values())[0];

    return conversation ? conversation.patterns : [];
  }

  generateLLMPrompt(conversationId) {
    const conversation = conversationId ?
      this.conversations.get(conversationId) :
      Array.from(this.conversations.values())[0];

    if (!conversation) return '';

    return `
Analyze this conversation with strict speaker attribution:

CONVERSATION STRUCTURE:
- Thread: ${conversation.id}
- Timeframe: ${conversation.metadata.timeframe.start.toISOString()} to ${conversation.metadata.timeframe.end.toISOString()}
- Participants: ${conversation.metadata.participants.map(p => p.name).join(', ')}

MESSAGE SEQUENCE:
${conversation.messages.map(msg => `
[${msg.timestamp.toISOString()}] ${msg.speaker.name} (${msg.speaker.role}):
"${msg.content.text}"
- Type: ${msg.content.type}
- Responding to: ${msg.context.references.join(', ') || 'N/A'}
- Evidence: ${msg.content.evidence.join(', ') || 'None'}
- Verification: Speaker (${msg.verification.speaker_confidence}), Content (${msg.verification.content_confidence})
`).join('\n')}

SPEAKER ROLES:
${conversation.metadata.participants.map(participant => `
${participant.name}:
- Roles: ${Array.from(participant.roles).join(', ')}
- Claims: ${participant.claims.length}
- Evidence Provided: ${participant.evidence.length}
`).join('\n')}

CRITICAL INSTRUCTIONS:
1. Maintain strict speaker attribution
2. Verify quote ownership before attribution
3. Follow reply chains for context
4. Note speaker roles and patterns
`;
  }
}

module.exports = { ConversationProcessor };
