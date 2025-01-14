class AttributionValidator {
  constructor() {
    this.validationRules = new Map([
      ['speaker_consistency', this.validateSpeakerConsistency],
      ['evidence_chain', this.validateEvidenceChain],
      ['temporal_consistency', this.validateTemporalConsistency],
      ['context_validity', this.validateContextValidity]
    ]);
  }

  async validateAttribution(processedConversation) {
    const validationResults = await Promise.all(
      Array.from(this.validationRules.entries()).map(([rule, validator]) =>
        validator.call(this, processedConversation)
      )
    );

    const issues = validationResults.flatMap(result => result.issues);
    const confidence = this.calculateOverallConfidence(validationResults);

    return {
      valid: issues.length === 0,
      confidence,
      issues,
      suggestions: this.generateSuggestions(issues)
    };
  }

  async validateSpeakerConsistency(conversation) {
    const issues = [];
    const speakers = new Map();

    // Track speaker behavior patterns
    conversation.messages.forEach(message => {
      const { speaker, content, context, verification } = message;
      
      if (!speakers.has(speaker.id)) {
        speakers.set(speaker.id, {
          roles: new Set(),
          claims: [],
          evidence: [],
          references: new Set(),
          contradictions: []
        });
      }

      const profile = speakers.get(speaker.id);
      profile.roles.add(speaker.role);

      // Track claims and evidence
      if (content.type === 'claim') {
        profile.claims.push(message);
      }
      if (content.evidence.length > 0) {
        profile.evidence.push(...content.evidence);
      }

      // Track references and contradictions
      context.references.forEach(ref => profile.references.add(ref));
      if (context.ignores_evidence) {
        profile.contradictions.push({
          message: message.id,
          ignored: context.ignores_evidence
        });
      }
    });

    // Validate speaker consistency
    speakers.forEach((profile, speakerId) => {
      // Check for role consistency
      if (profile.roles.size > 2) {
        issues.push({
          type: 'inconsistent_roles',
          speaker: speakerId,
          roles: Array.from(profile.roles),
          severity: 'warning'
        });
      }

      // Check for evidence-claim patterns
      if (profile.claims.length > 0 && profile.evidence.length === 0) {
        issues.push({
          type: 'claims_without_evidence',
          speaker: speakerId,
          claims: profile.claims.length,
          severity: 'info'
        });
      }

      // Check for contradiction patterns
      if (profile.contradictions.length > 0) {
        const contradictedEvidence = new Set(
          profile.contradictions.flatMap(c => c.ignored)
        );
        if (profile.evidence.some(e => contradictedEvidence.has(e))) {
          issues.push({
            type: 'self_contradiction',
            speaker: speakerId,
            instances: profile.contradictions.length,
            severity: 'error'
          });
        }
      }
    });

    return {
      valid: issues.length === 0,
      confidence: this.calculateConfidence(issues),
      issues
    };
  }

  async validateEvidenceChain(conversation) {
    const issues = [];
    const evidenceMap = new Map();

    // Build evidence reference map
    conversation.evidence.forEach(evidence => {
      evidenceMap.set(evidence.id, {
        provider: evidence.provider.id,
        references: new Set(),
        acknowledgments: new Set(),
        contradictions: new Set()
      });
    });

    // Track evidence usage
    conversation.messages.forEach(message => {
      // Track evidence references
      message.content.evidence.forEach(evidenceId => {
        if (evidenceMap.has(evidenceId)) {
          evidenceMap.get(evidenceId).references.add(message.id);
        } else {
          issues.push({
            type: 'missing_evidence',
            evidenceId,
            messageId: message.id,
            severity: 'error'
          });
        }
      });

      // Track acknowledgments
      if (message.content.type === 'acknowledgment') {
        message.context.references.forEach(refId => {
          const refMessage = conversation.messages.find(m => m.id === refId);
          if (refMessage && refMessage.content.evidence.length > 0) {
            refMessage.content.evidence.forEach(evidenceId => {
              if (evidenceMap.has(evidenceId)) {
                evidenceMap.get(evidenceId).acknowledgments.add(message.id);
              }
            });
          }
        });
      }

      // Track contradictions
      if (message.context.ignores_evidence) {
        message.context.ignores_evidence.forEach(evidenceId => {
          if (evidenceMap.has(evidenceId)) {
            evidenceMap.get(evidenceId).contradictions.add(message.id);
          }
        });
      }
    });

    // Validate evidence chains
    evidenceMap.forEach((usage, evidenceId) => {
      // Check for unused evidence
      if (usage.references.size === 0) {
        issues.push({
          type: 'unused_evidence',
          evidenceId,
          severity: 'warning'
        });
      }

      // Check for unacknowledged evidence
      if (usage.references.size > 0 && usage.acknowledgments.size === 0) {
        issues.push({
          type: 'unacknowledged_evidence',
          evidenceId,
          severity: 'info'
        });
      }

      // Check for contradicted evidence
      if (usage.contradictions.size > 0) {
        issues.push({
          type: 'contradicted_evidence',
          evidenceId,
          contradictions: Array.from(usage.contradictions),
          severity: 'warning'
        });
      }
    });

    return {
      valid: issues.length === 0,
      confidence: this.calculateConfidence(issues),
      issues
    };
  }

  async validateTemporalConsistency(conversation) {
    const issues = [];
    const timeline = new Map();

    // Build timeline
    conversation.messages.forEach(message => {
      const timestamp = message.timestamp.getTime();
      if (!timeline.has(timestamp)) {
        timeline.set(timestamp, []);
      }
      timeline.get(timestamp).push(message);
    });

    // Sort timeline
    const sortedEvents = Array.from(timeline.entries())
      .sort(([a], [b]) => a - b);

    // Validate temporal consistency
    let previousEvent = null;
    sortedEvents.forEach(([timestamp, messages]) => {
      messages.forEach(message => {
        // Check reference consistency
        message.context.references.forEach(refId => {
          const refMessage = conversation.messages.find(m => m.id === refId);
          if (refMessage && refMessage.timestamp > message.timestamp) {
            issues.push({
              type: 'future_reference',
              messageId: message.id,
              referenceId: refId,
              severity: 'error'
            });
          }
        });

        // Check evidence temporal consistency
        message.content.evidence.forEach(evidenceId => {
          const evidence = conversation.evidence.find(e => e.id === evidenceId);
          if (evidence && evidence.timestamp > message.timestamp) {
            issues.push({
              type: 'future_evidence',
              messageId: message.id,
              evidenceId,
              severity: 'error'
            });
          }
        });

        previousEvent = message;
      });
    });

    return {
      valid: issues.length === 0,
      confidence: this.calculateConfidence(issues),
      issues
    };
  }

  async validateContextValidity(conversation) {
    const issues = [];

    conversation.messages.forEach(message => {
      // Validate reference context
      message.context.references.forEach(refId => {
        const refMessage = conversation.messages.find(m => m.id === refId);
        if (!refMessage) {
          issues.push({
            type: 'invalid_reference',
            messageId: message.id,
            referenceId: refId,
            severity: 'error'
          });
        }
      });

      // Validate evidence context
      message.content.evidence.forEach(evidenceId => {
        const evidence = conversation.evidence.find(e => e.id === evidenceId);
        if (!evidence) {
          issues.push({
            type: 'invalid_evidence',
            messageId: message.id,
            evidenceId,
            severity: 'error'
          });
        }
      });

      // Validate ignored evidence
      if (message.context.ignores_evidence) {
        message.context.ignores_evidence.forEach(evidenceId => {
          const evidence = conversation.evidence.find(e => e.id === evidenceId);
          if (!evidence) {
            issues.push({
              type: 'invalid_ignored_evidence',
              messageId: message.id,
              evidenceId,
              severity: 'error'
            });
          }
        });
      }
    });

    return {
      valid: issues.length === 0,
      confidence: this.calculateConfidence(issues),
      issues
    };
  }

  async validateLLMOutput(llmOutput, processedConversation) {
    const issues = [];

    // Validate quote attributions
    if (llmOutput.quotes) {
      llmOutput.quotes.forEach(quote => {
        const found = processedConversation.messages.find(message =>
          message.content.text.includes(quote.text) &&
          message.speaker.name === quote.speaker
        );

        if (!found) {
          issues.push({
            type: 'misattributed_quote',
            quote: quote.text,
            claimed_speaker: quote.speaker,
            severity: 'error'
          });
        }
      });
    }

    // Validate evidence references
    const evidencePattern = /evidence shows|proves|confirms|demonstrates/i;
    if (evidencePattern.test(llmOutput.analysis)) {
      const evidenceClaims = llmOutput.analysis.match(/[^.]*evidence[^.]*/g) || [];
      
      evidenceClaims.forEach(claim => {
        const hasValidEvidence = processedConversation.evidence.some(evidence =>
          claim.toLowerCase().includes(evidence.content.type.toLowerCase())
        );

        if (!hasValidEvidence) {
          issues.push({
            type: 'unverified_evidence_claim',
            claim,
            severity: 'error'
          });
        }
      });
    }

    return {
      valid: issues.length === 0,
      attributionAccurate: !issues.some(i => i.type === 'misattributed_quote'),
      confidence: this.calculateConfidence(issues),
      issues
    };
  }

  calculateConfidence(issues) {
    if (issues.length === 0) return 1.0;

    const severityWeights = {
      error: 0.4,
      warning: 0.2,
      info: 0.1
    };

    const totalImpact = issues.reduce((sum, issue) => 
      sum + (severityWeights[issue.severity] || 0.1), 0);

    return Math.max(0, 1 - totalImpact);
  }

  calculateOverallConfidence(results) {
    if (results.length === 0) return 0;

    const weights = {
      speaker_consistency: 0.4,
      evidence_chain: 0.3,
      temporal_consistency: 0.2,
      context_validity: 0.1
    };

    let totalWeight = 0;
    let weightedSum = 0;

    results.forEach((result, index) => {
      const ruleName = Array.from(this.validationRules.keys())[index];
      const weight = weights[ruleName] || 0.1;
      
      totalWeight += weight;
      weightedSum += weight * result.confidence;
    });

    return weightedSum / totalWeight;
  }

  generateSuggestions(issues) {
    return issues.map(issue => {
      switch (issue.type) {
        case 'misattributed_quote':
          return `Verify speaker attribution for quote: "${issue.quote}"`;
        case 'missing_evidence':
          return `Locate referenced evidence: ${issue.evidenceId}`;
        case 'future_reference':
          return `Check temporal consistency of message ${issue.messageId}`;
        case 'invalid_reference':
          return `Validate reference chain for message ${issue.messageId}`;
        default:
          return `Address ${issue.type} in ${issue.messageId || 'conversation'}`;
      }
    });
  }
}

module.exports = { AttributionValidator };
