class EvidenceChainBuilder {
  constructor() {
    this.chains = new Map();
    this.evidenceIndex = new Map();
    this.claimIndex = new Map();
  }

  async buildChain(data) {
    const chainId = this.generateChainId(data);
    
    // Process core components
    const claims = await this.processClaims(data.messages);
    const evidence = await this.processEvidence(data.evidence);
    const timeline = await this.buildTimeline(data.messages, data.evidence);

    // Build relationships
    const relationships = await this.buildRelationships(claims, evidence, timeline);

    // Construct chain
    const chain = {
      id: chainId,
      claim: this.findPrimaryClaim(claims),
      evidence: {
        primary: this.findPrimaryEvidence(evidence),
        supporting: this.findSupportingEvidence(evidence),
        contradicting: this.findContradictingEvidence(evidence)
      },
      timeline: {
        sequence: timeline,
        patterns: await this.detectPatterns(timeline)
      },
      verification: await this.verifyChain(claims, evidence, relationships),
      relationships
    };

    this.chains.set(chainId, chain);
    return chain;
  }

  generateChainId(data) {
    const timestamp = new Date().toISOString();
    const topic = this.extractTopic(data.messages);
    return `chain-${topic}-${timestamp}`;
  }

  async processClaims(messages) {
    const claims = messages
      .filter(m => m.type === 'claim')
      .map(message => ({
        id: message.id,
        text: message.text,
        speaker: message.speaker,
        timestamp: message.timestamp,
        evidence: message.evidence || [],
        references: message.references || [],
        context: {
          preceding: this.findPrecedingMessages(message, messages),
          following: this.findFollowingMessages(message, messages)
        },
        verification: {
          status: 'unverified',
          confidence: 0,
          methods: []
        }
      }));

    // Index claims for quick lookup
    claims.forEach(claim => this.claimIndex.set(claim.id, claim));

    return claims;
  }

  async processEvidence(evidence) {
    const processedEvidence = evidence.map(item => ({
      id: item.id,
      type: item.type,
      content: item.content,
      provider: item.provider,
      timestamp: item.timestamp,
      verification: item.verification,
      usage: {
        supports: [],
        contradicts: [],
        references: []
      },
      relationships: {
        precedes: [],
        follows: [],
        related: []
      }
    }));

    // Index evidence for quick lookup
    processedEvidence.forEach(e => this.evidenceIndex.set(e.id, e));

    return processedEvidence;
  }

  async buildTimeline(messages, evidence) {
    const events = [
      ...messages.map(m => ({
        id: m.id,
        type: 'message',
        timestamp: m.timestamp,
        actor: m.speaker,
        content: m.text,
        evidence: m.evidence || [],
        references: m.references || []
      })),
      ...evidence.map(e => ({
        id: e.id,
        type: 'evidence',
        timestamp: e.timestamp,
        actor: e.provider,
        content: e.content,
        verification: e.verification
      }))
    ];

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Add contextual relationships
    return events.map((event, index) => ({
      ...event,
      context: {
        preceding: events.slice(Math.max(0, index - 2), index),
        following: events.slice(index + 1, Math.min(events.length, index + 3))
      }
    }));
  }

  async buildRelationships(claims, evidence, timeline) {
    const relationships = new Map();

    // Track claim-evidence relationships
    claims.forEach(claim => {
      claim.evidence.forEach(evidenceId => {
        const evidence = this.evidenceIndex.get(evidenceId);
        if (evidence) {
          if (!relationships.has(claim.id)) {
            relationships.set(claim.id, new Set());
          }
          relationships.get(claim.id).add({
            type: 'supported_by',
            target: evidenceId,
            confidence: this.calculateRelationshipConfidence(claim, evidence)
          });
        }
      });
    });

    // Track temporal relationships
    timeline.forEach((event, index) => {
      if (index > 0) {
        const previousEvent = timeline[index - 1];
        if (!relationships.has(event.id)) {
          relationships.set(event.id, new Set());
        }
        relationships.get(event.id).add({
          type: 'follows',
          target: previousEvent.id,
          confidence: 1.0
        });
      }
    });

    // Track contradictions
    claims.forEach(claim => {
      const contradictions = this.findContradictions(claim, claims);
      contradictions.forEach(contradiction => {
        if (!relationships.has(claim.id)) {
          relationships.set(claim.id, new Set());
        }
        relationships.get(claim.id).add({
          type: 'contradicts',
          target: contradiction.id,
          confidence: this.calculateContradictionConfidence(claim, contradiction)
        });
      });
    });

    return relationships;
  }

  async detectPatterns(timeline) {
    const patterns = [];

    // Detect claim-response patterns
    const claimResponses = this.detectClaimResponsePatterns(timeline);
    patterns.push(...claimResponses);

    // Detect evidence presentation patterns
    const evidencePatterns = this.detectEvidencePatterns(timeline);
    patterns.push(...evidencePatterns);

    // Detect behavioral patterns
    const behavioralPatterns = this.detectBehavioralPatterns(timeline);
    patterns.push(...behavioralPatterns);

    return patterns;
  }

  async verifyChain(claims, evidence, relationships) {
    const verification = {
      status: 'unverified',
      confidence: 0,
      methods: [],
      issues: []
    };

    // Check primary claim verification
    const primaryClaim = this.findPrimaryClaim(claims);
    if (!primaryClaim) {
      verification.issues.push('no_primary_claim');
      return verification;
    }

    // Check evidence coverage
    const evidenceCoverage = this.calculateEvidenceCoverage(primaryClaim, evidence);
    if (evidenceCoverage < 0.5) {
      verification.issues.push('insufficient_evidence');
    }

    // Check temporal consistency
    const temporallyValid = this.validateTemporalConsistency(claims, evidence);
    if (!temporallyValid) {
      verification.issues.push('temporal_inconsistency');
    }

    // Calculate verification status
    verification.status = this.determineVerificationStatus(
      evidenceCoverage,
      temporallyValid,
      relationships
    );

    // Calculate confidence
    verification.confidence = this.calculateVerificationConfidence(
      evidenceCoverage,
      temporallyValid,
      relationships
    );

    // Record verification methods
    verification.methods = this.determineVerificationMethods(
      primaryClaim,
      evidence,
      relationships
    );

    return verification;
  }

  // Helper methods
  findPrecedingMessages(message, messages) {
    return messages
      .filter(m => 
        new Date(m.timestamp) < new Date(message.timestamp) &&
        new Date(m.timestamp) > new Date(message.timestamp) - 1000 * 60 * 60 // 1 hour
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  findFollowingMessages(message, messages) {
    return messages
      .filter(m =>
        new Date(m.timestamp) > new Date(message.timestamp) &&
        new Date(m.timestamp) < new Date(message.timestamp) + 1000 * 60 * 60 // 1 hour
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  findPrimaryClaim(claims) {
    // Find claim with most evidence and references
    return claims.reduce((primary, claim) => {
      const score = (claim.evidence?.length || 0) + (claim.references?.length || 0);
      const primaryScore = (primary?.evidence?.length || 0) + (primary?.references?.length || 0);
      return score > primaryScore ? claim : primary;
    }, null);
  }

  findPrimaryEvidence(evidence) {
    // Find evidence with highest verification confidence
    return evidence.reduce((primary, evidence) => {
      return (evidence.verification?.confidence || 0) > (primary?.verification?.confidence || 0)
        ? evidence
        : primary;
    }, null);
  }

  findSupportingEvidence(evidence) {
    return evidence.filter(e => 
      e.usage.supports.length > 0 && e.verification?.status === 'verified'
    );
  }

  findContradictingEvidence(evidence) {
    return evidence.filter(e => e.usage.contradicts.length > 0);
  }

  findContradictions(claim, claims) {
    return claims.filter(c =>
      c.id !== claim.id &&
      this.areClaimsContradictory(claim, c)
    );
  }

  areClaimsContradictory(claim1, claim2) {
    // Simple contradiction check - claims about same topic with opposite assertions
    const topic1 = this.extractTopic([{ text: claim1.text }]);
    const topic2 = this.extractTopic([{ text: claim2.text }]);
    
    if (topic1 !== topic2) return false;

    const words1 = new Set(claim1.text.toLowerCase().split(/\W+/));
    const words2 = new Set(claim2.text.toLowerCase().split(/\W+/));
    
    // Check for negation words
    const negationWords = new Set(['not', 'no', 'never', 'none']);
    const hasNegation = (words) => Array.from(negationWords).some(word => words.has(word));
    
    return hasNegation(words1) !== hasNegation(words2);
  }

  extractTopic(messages) {
    // Simple topic extraction - most frequent significant word
    const words = messages
      .flatMap(m => m.text.toLowerCase().split(/\W+/))
      .filter(word => word.length > 3);
    
    const frequency = new Map();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort(([, a], [, b]) => b - a)
      [0]?.[0] || 'unknown';
  }

  calculateRelationshipConfidence(claim, evidence) {
    // Base confidence from evidence verification
    let confidence = evidence.verification?.confidence || 0.5;

    // Adjust based on temporal proximity
    const timeDiff = Math.abs(
      new Date(claim.timestamp) - new Date(evidence.timestamp)
    );
    if (timeDiff < 1000 * 60 * 60) { // Within an hour
      confidence *= 1.2;
    }

    // Adjust based on reference clarity
    if (claim.references.includes(evidence.id)) {
      confidence *= 1.1;
    }

    return Math.min(1, confidence);
  }

  calculateContradictionConfidence(claim1, claim2) {
    // Base confidence from claim similarities
    let confidence = 0.5;

    // Adjust based on temporal proximity
    const timeDiff = Math.abs(
      new Date(claim1.timestamp) - new Date(claim2.timestamp)
    );
    if (timeDiff < 1000 * 60 * 60) { // Within an hour
      confidence *= 1.2;
    }

    // Adjust based on evidence presence
    if (claim1.evidence.length > 0 && claim2.evidence.length > 0) {
      confidence *= 1.3;
    }

    return Math.min(1, confidence);
  }

  calculateEvidenceCoverage(claim, evidence) {
    if (!claim || evidence.length === 0) return 0;

    const directEvidence = evidence.filter(e => 
      claim.evidence.includes(e.id) && e.verification?.status === 'verified'
    );

    const supportingEvidence = evidence.filter(e =>
      e.usage.supports.includes(claim.id) && e.verification?.status === 'verified'
    );

    return (directEvidence.length + supportingEvidence.length * 0.5) / evidence.length;
  }

  validateTemporalConsistency(claims, evidence) {
    // Check if evidence precedes claims that reference it
    for (const claim of claims) {
      for (const evidenceId of claim.evidence) {
        const evidenceItem = this.evidenceIndex.get(evidenceId);
        if (evidenceItem && new Date(evidenceItem.timestamp) > new Date(claim.timestamp)) {
          return false;
        }
      }
    }

    return true;
  }

  determineVerificationStatus(evidenceCoverage, temporallyValid, relationships) {
    if (!temporallyValid) return 'invalid';
    if (evidenceCoverage >= 0.8) return 'verified';
    if (evidenceCoverage >= 0.5) return 'partially_verified';
    return 'unverified';
  }

  calculateVerificationConfidence(evidenceCoverage, temporallyValid, relationships) {
    let confidence = evidenceCoverage;

    if (!temporallyValid) confidence *= 0.5;

    // Adjust based on relationship strength
    const relationshipStrength = Array.from(relationships.values())
      .flatMap(rels => Array.from(rels))
      .reduce((sum, rel) => sum + rel.confidence, 0) / relationships.size;

    confidence *= (0.7 + relationshipStrength * 0.3);

    return Math.min(1, confidence);
  }

  determineVerificationMethods(claim, evidence, relationships) {
    const methods = new Set();

    if (evidence.some(e => e.verification?.status === 'verified')) {
      methods.add('document_verification');
    }

    if (this.validateTemporalConsistency([claim], evidence)) {
      methods.add('temporal_validation');
    }

    if (relationships.size > 0) {
      methods.add('relationship_analysis');
    }

    return Array.from(methods);
  }

  detectClaimResponsePatterns(timeline) {
    const patterns = [];
    let currentClaim = null;
    let responses = [];

    timeline.forEach(event => {
      if (event.type === 'message') {
        if (event.content.type === 'claim') {
          if (currentClaim) {
            patterns.push({
              type: 'claim_response',
              claim: currentClaim,
              responses,
              resolution: this.analyzeResolution(responses)
            });
          }
          currentClaim = event;
          responses = [];
        } else if (currentClaim && event.references.includes(currentClaim.id)) {
          responses.push(event);
        }
      }
    });

    return patterns;
  }

  detectEvidencePatterns(timeline) {
    const patterns = [];
    const evidenceUsage = new Map();

    timeline.forEach(event => {
      if (event.type === 'evidence') {
        if (!evidenceUsage.has(event.id)) {
          evidenceUsage.set(event.id, {
            evidence: event,
            references: [],
            acknowledgments: []
          });
        }
      } else if (event.type === 'message') {
        event.evidence.forEach(evidenceId => {
          if (evidenceUsage.has(evidenceId)) {
            evidenceUsage.get(evidenceId).references.push(event);
          }
        });
      }
    });

    evidenceUsage.forEach((usage, evidenceId) => {
      if (usage.references.length > 0) {
        patterns.push({
          type: 'evidence_usage',
          evidence: usage.evidence,
          references: usage.references,
          impact: this.analyzeEvidenceImpact(usage)
        });
      }
    });

    return patterns;
  }

  detectBehavioralPatterns(timeline) {
    const patterns = [];
    const speakerBehavior = new Map();

    timeline.forEach(event => {
      if (event.type === 'message') {
        const speaker = event.actor;
        if (!speakerBehavior.has(speaker)) {
          speakerBehavior.set(speaker, {
            claims: [],
            evidence: [],
            responses: []
          });
        }

        const behavior = speakerBehavior.get(speaker);
        if (event.content.type === 'claim') {
          behavior.claims.push(event);
        } else if (event.evidence.length > 0) {
          behavior.evidence.push(event);
        } else if (event.references.length > 0) {
          behavior.responses.push(event);
        }
      }
    });

    speakerBehavior.forEach((behavior, speaker) => {
      patterns.push({
        type: 'speaker_behavior',
        speaker,
        behavior: this.analyzeBehavior(behavior)
      });
    });

    return patterns;
  }

  analyzeResolution(responses) {
    const evidenceResponses = responses.filter(r => r.evidence.length > 0);
    const acknowledgments = responses.filter(r => r.content.type === 'acknowledgment');

    if (evidenceResponses.length > 0 && acknowledgments.length > 0) {
      return {
        status: 'verified',
        confidence: 0.9,
        method: 'evidence_acknowledged'
      };
    }

    if (evidenceResponses.length > 0) {
      return {
        status: 'evidence_provided',
        confidence: 0.7,
        method: 'evidence_presented'
      };
    }

    return {
      status: 'unresolved',
      confidence: 0.3,
      method: 'discussion_only'
    };
  }

  analyzeEvidenceImpact(usage) {
    const acknowledgments = usage.references.filter(r => 
      r.content.type === 'acknowledgment'
    );
    const contradictions = usage.references.filter(r =>
      r.content.type === 'contradiction'
    );

    return {
      acknowledged: acknowledgments.length > 0,
      contested: contradictions.length > 0,
      impact_score: (acknowledgments.length - contradictions.length) / usage.references.length
    };
  }

  analyzeBehavior(behavior) {
    return {
      evidence_based: behavior.evidence.length > behavior.claims.length,
      responsive: behavior.responses.length > 0,
      pattern: this.determineBehaviorPattern(behavior),
      consistency: this.calculateBehaviorConsistency(behavior)
    };
  }

  determineBehaviorPattern(behavior) {
    if (behavior.evidence.length > behavior.claims.length) {
      return 'evidence_focused';
    }
    if (behavior.claims.length > 0 && behavior.evidence.length === 0) {
      return 'claim_only';
    }
    if (behavior.responses.length > behavior.claims.length + behavior.evidence.length) {
      return 'responsive';
    }
    return 'mixed';
  }

  calculateBehaviorConsistency(behavior) {
    const totalActions = behavior.claims.length + behavior.evidence.length + behavior.responses.length;
    if (totalActions < 2) return 1.0;

    const patterns = this.determineBehaviorPattern(behavior);
    const patternStrength = {
      evidence_focused: behavior.evidence.length / totalActions,
      claim_only: behavior.claims.length / totalActions,
      responsive: behavior.responses.length / totalActions,
      mixed: Math.min(
        behavior.evidence.length,
        behavior.claims.length,
        behavior.responses.length
      ) / totalActions
    };

    return patternStrength[patterns];
  }
}

module.exports = { EvidenceChainBuilder };
