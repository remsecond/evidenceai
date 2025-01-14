import { PDFExtractor } from './extractors/pdf-extractor.js';
import { ODSExtractor } from './extractors/ods-extractor.js';
import { EmailExtractor } from './extractors/email-extractor.js';
import { AttachmentProcessor } from './extractors/attachment-processor.js';
import { TemporalValidator } from './validators/temporal-validator.js';
import { ContentValidator } from './validators/content-validator.js';
import { ReferenceValidator } from './validators/reference-validator.js';
import path from 'path';

export class UniversalProcessor {
  constructor(config = {}) {
    this.extractors = {
      pdf: new PDFExtractor(),
      ods: new ODSExtractor(),
      email: new EmailExtractor(),
      attachments: new AttachmentProcessor(),
      ...config.extractors
    };

    this.validators = {
      temporal: new TemporalValidator(),
      content: new ContentValidator(),
      reference: new ReferenceValidator(),
      ...config.validators
    };

    this.sourceResults = new Map();
    this.relationships = new Map();
    this.timeline = [];
  }

  async processSource(source) {
    try {
      let extractor;
      const ext = path.extname(source.path).toLowerCase();

      // Choose extractor based on file extension and type
      if (ext === '.txt') {
        if (source.type === 'email_thread') {
          extractor = this.extractors.email;
        } else {
          extractor = this.extractors.pdf; // PDFExtractor handles OFW text files
        }
      } else if (ext === '.pdf') {
        extractor = this.extractors.pdf;
      } else if (ext === '.ods' || ext === '.csv') {
        extractor = this.extractors.ods;
      } else {
        // Fallback to type-based selection
        switch (source.type) {
          case 'ofw_report':
            extractor = this.extractors.pdf;
            break;
          case 'email_thread':
            extractor = this.extractors.email;
            break;
          case 'email_metadata':
            extractor = this.extractors.ods;
            break;
          default:
            throw new Error(`Unknown source type: ${source.type}`);
        }
      }

      const result = await extractor.process(source.path);

      // Validate temporal consistency
      const temporalValidation = await this.validators.temporal.validate(result);
      if (!temporalValidation.valid) {
        console.warn(`Temporal validation issues for ${source.type}:`, temporalValidation.issues);
      }

      // Validate content
      const contentValidation = await this.validators.content.validate(result);
      if (!contentValidation.valid) {
        console.warn(`Content validation issues for ${source.type}:`, contentValidation.issues);
      }

      // Store result for cross-referencing
      this.sourceResults.set(source.type, {
        ...result,
        metadata: {
          type: source.type,
          timestamp: source.metadata.timestamp,
          validation: {
            temporal: temporalValidation,
            content: contentValidation
          }
        }
      });

      // Extract timeframe from metadata or messages
      const timeframe = result.metadata?.timeframe || {
        start: result.messages?.[0]?.timestamp,
        end: result.messages?.[result.messages?.length - 1]?.timestamp
      };

      return {
        success: true,
        type: source.type,
        messages: result.messages || [],
        metadata: {
          timeframe,
          participants: result.metadata?.participants || result.participants || [],
          validation: {
            temporal: temporalValidation,
            content: contentValidation
          }
        }
      };
    } catch (error) {
      console.error(`Error processing source ${source.type}:`, error);
      return {
        success: false,
        type: source.type,
        error: error.message
      };
    }
  }

  async processAttachments(attachmentsPath) {
    try {
      const results = await this.extractors.attachments.processDirectory(attachmentsPath);
      return {
        success: true,
        processed: results,
        metadata: await this.extractors.attachments.extractMetadata(results)
      };
    } catch (error) {
      console.error('Error processing attachments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processAll({ sources, attachments }) {
    try {
      // Process each source
      const sourceResults = await Promise.all(
        sources.map(source => this.processSource(source))
      );

      // Process attachments if provided
      const attachmentResults = attachments ? 
        await this.processAttachments(attachments.path) : 
        { success: true, processed: [] };

      // Build unified timeline
      const timeline = await this.buildTimeline(sourceResults);

      // Extract and validate claims
      const claims = await this.extractClaims(sourceResults);

      // Detect conflicts
      const conflicts = await this.detectConflicts(sourceResults);

      // Build relationships
      const relationships = await this.buildRelationships(
        sourceResults, 
        attachmentResults,
        timeline
      );

      // Generate unified output
      return {
        metadata: {
          sources: this.buildSourceMetadata(sources),
          timeframe: this.calculateTimeframe(timeline),
          confidence: this.calculateConfidence(sourceResults, conflicts)
        },
        content: {
          messages: this.unifyMessages(sourceResults),
          attachments: attachmentResults.processed,
          relationships: relationships.data
        },
        timeline: {
          events: timeline.events,
          patterns: timeline.patterns,
          confidence: timeline.confidence
        },
        relationships: {
          data: relationships.data,
          patterns: relationships.patterns,
          confidence: relationships.confidence
        },
        verification: {
          status: this.determineVerificationStatus(claims, conflicts),
          confidence: this.calculateVerificationConfidence(claims, conflicts),
          methods: this.getVerificationMethods(sourceResults)
        }
      };
    } catch (error) {
      console.error('Error in universal processing:', error);
      throw error;
    }
  }

  async buildTimeline(results) {
    const events = [];
    const patterns = [];

    // Collect all events
    results.forEach(result => {
      if (result.messages) {
        events.push(...result.messages.map(msg => ({
          type: 'message',
          source: result.type,
          timestamp: msg.timestamp,
          content: msg
        })));
      }
    });

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Detect patterns
    patterns.push(...this.detectTimelinePatterns(events));

    // Validate temporal consistency
    const validation = await this.validators.temporal.validateTimeline(events);

    return {
      valid: validation.valid,
      events,
      patterns,
      gaps: validation.gaps || [],
      confidence: validation.confidence
    };
  }

  async extractClaims(results) {
    const claims = [];
    const sourceMap = new Map();

    // Extract claims from each source
    results.forEach(result => {
      if (result.messages) {
        const sourceClaims = this.findClaims(result.messages);
        claims.push(...sourceClaims);
        sourceMap.set(result.type, sourceClaims);
      }
    });

    // Cross-validate claims
    return claims.map(claim => {
      const sources = this.findClaimSources(claim, sourceMap);
      const verification = this.verifyClaim(claim, sources);
      
      return {
        ...claim,
        sources,
        verification,
        consistency: this.calculateClaimConsistency(claim, sources)
      };
    });
  }

  findClaims(messages) {
    return messages.filter(msg => 
      msg.type === 'claim' || 
      msg.content.toLowerCase().includes('claim') ||
      msg.content.toLowerCase().includes('states that')
    );
  }

  findClaimSources(claim, sourceMap) {
    const sources = [];
    sourceMap.forEach((claims, type) => {
      const related = claims.filter(c => this.areClaimsRelated(claim, c));
      if (related.length > 0) {
        sources.push({
          type,
          claims: related,
          confidence: this.calculateSourceConfidence(related)
        });
      }
    });
    return sources;
  }

  areClaimsRelated(claim1, claim2) {
    // Simple text similarity check
    const words1 = new Set(claim1.content.toLowerCase().split(/\W+/));
    const words2 = new Set(claim2.content.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    return intersection.size / Math.max(words1.size, words2.size) > 0.3;
  }

  calculateSourceConfidence(claims) {
    return claims.reduce((sum, claim) => 
      sum + (claim.verification?.confidence || 0), 0
    ) / claims.length;
  }

  verifyClaim(claim, sources) {
    // Simple verification based on source count and confidence
    const confidence = sources.reduce((sum, source) => 
      sum + source.confidence, 0
    ) / Math.max(1, sources.length);

    let status = 'unverified';
    if (sources.length > 1 && confidence > 0.7) {
      status = 'corroborated';
    } else if (sources.length === 1 && confidence > 0.8) {
      status = 'verified';
    }

    return { status, confidence };
  }

  calculateClaimConsistency(claim, sources) {
    if (sources.length <= 1) return 1.0;

    // Check consistency across sources
    const consistencyScores = [];
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const score = this.compareSourceClaims(
          sources[i].claims,
          sources[j].claims
        );
        consistencyScores.push(score);
      }
    }

    return consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
  }

  compareSourceClaims(claims1, claims2) {
    const similarities = [];
    claims1.forEach(c1 => {
      claims2.forEach(c2 => {
        const similarity = this.calculateTextSimilarity(
          c1.content,
          c2.content
        );
        similarities.push(similarity);
      });
    });

    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
  }

  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    return intersection.size / Math.max(words1.size, words2.size);
  }

  async detectConflicts(results) {
    const conflicts = [];

    // Compare claims across sources
    const claims = await this.extractClaims(results);
    const claimGroups = this.groupRelatedClaims(claims);

    claimGroups.forEach(group => {
      const conflicting = this.findConflictingClaims(group);
      if (conflicting.length > 0) {
        conflicts.push({
          type: 'claim_conflict',
          claims: conflicting,
          sources: this.getConflictSources(conflicting),
          resolution: this.resolveConflict(conflicting)
        });
      }
    });

    return conflicts;
  }

  groupRelatedClaims(claims) {
    const groups = [];
    const processed = new Set();

    claims.forEach(claim => {
      if (processed.has(claim.id)) return;

      const group = [claim];
      processed.add(claim.id);

      claims.forEach(other => {
        if (!processed.has(other.id) && this.areClaimsRelated(claim, other)) {
          group.push(other);
          processed.add(other.id);
        }
      });

      groups.push(group);
    });

    return groups;
  }

  findConflictingClaims(claims) {
    return claims.filter(claim => 
      claims.some(other => 
        claim.id !== other.id && this.areClaimsContradictory(claim, other)
      )
    );
  }

  areClaimsContradictory(claim1, claim2) {
    // Check for direct negation
    const hasNegation = text => 
      /\b(not|never|no|didn't|wasn't|haven't)\b/i.test(text);
    
    return hasNegation(claim1.content) !== hasNegation(claim2.content);
  }

  getConflictSources(claims) {
    return claims.reduce((sources, claim) => {
      claim.sources.forEach(source => {
        if (!sources.includes(source.type)) {
          sources.push(source.type);
        }
      });
      return sources;
    }, []);
  }

  resolveConflict(claims) {
    // Prioritize claims with evidence
    const withEvidence = claims.filter(c => c.evidence?.length > 0);
    if (withEvidence.length === 1) {
      return {
        resolution: 'evidence_based',
        claim: withEvidence[0],
        confidence: 0.9
      };
    }

    // If multiple claims have evidence, use temporal order
    if (withEvidence.length > 1) {
      const latest = withEvidence.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      return {
        resolution: 'temporal_latest',
        claim: latest,
        confidence: 0.7
      };
    }

    return {
      resolution: 'unresolved',
      confidence: 0.3
    };
  }

  async buildRelationships(sourceResults, attachmentResults, timeline) {
    const relationships = {
      data: [],
      patterns: [],
      confidence: 0
    };

    // Build message relationships
    sourceResults.forEach(result => {
      if (result.messages) {
        const messageRels = this.buildMessageRelationships(result.messages);
        relationships.data.push(...messageRels);
      }
    });

    // Build attachment relationships
    if (attachmentResults.processed) {
      const attachmentRels = this.buildAttachmentRelationships(
        sourceResults,
        attachmentResults.processed
      );
      relationships.data.push(...attachmentRels);
    }

    // Detect relationship patterns
    relationships.patterns = this.detectRelationshipPatterns(relationships.data);

    // Calculate confidence
    relationships.confidence = this.calculateRelationshipConfidence(
      relationships.data,
      relationships.patterns
    );

    return relationships;
  }

  buildMessageRelationships(messages) {
    const relationships = [];
    
    messages.forEach(msg => {
      if (msg.references) {
        msg.references.forEach(refId => {
          relationships.push({
            type: 'reference',
            source: msg.id,
            target: refId,
            timestamp: msg.timestamp
          });
        });
      }
    });

    return relationships;
  }

  buildAttachmentRelationships(sourceResults, attachments) {
    const relationships = [];

    sourceResults.forEach(result => {
      if (result.messages) {
        result.messages.forEach(msg => {
          if (msg.evidence) {
            msg.evidence.forEach(evidenceId => {
              const attachment = attachments.find(a => a.id === evidenceId);
              if (attachment) {
                relationships.push({
                  type: 'evidence',
                  source: msg.id,
                  target: evidenceId,
                  timestamp: msg.timestamp
                });
              }
            });
          }
        });
      }
    });

    return relationships;
  }

  detectRelationshipPatterns(relationships) {
    const patterns = [];

    // Find chains of references
    const chains = this.findReferenceChains(relationships);
    if (chains.length > 0) {
      patterns.push({
        type: 'reference_chain',
        chains,
        confidence: this.calculateChainConfidence(chains)
      });
    }

    // Find evidence clusters
    const clusters = this.findEvidenceClusters(relationships);
    if (clusters.length > 0) {
      patterns.push({
        type: 'evidence_cluster',
        clusters,
        confidence: this.calculateClusterConfidence(clusters)
      });
    }

    return patterns;
  }

  findReferenceChains(relationships) {
    const chains = [];
    const refs = relationships.filter(r => r.type === 'reference');

    refs.forEach(start => {
      let chain = [start];
      let current = start;

      while (true) {
        const next = refs.find(r => r.source === current.target);
        if (!next || chain.length >= 5) break;
        chain.push(next);
        current = next;
      }

      if (chain.length > 1) {
        chains.push(chain);
      }
    });

    return chains;
  }

  findEvidenceClusters(relationships) {
    const clusters = [];
    const evidence = relationships.filter(r => r.type === 'evidence');

    evidence.forEach(ev => {
      const related = evidence.filter(other => 
        other.target === ev.target && other.source !== ev.source
      );

      if (related.length > 0) {
        clusters.push([ev, ...related]);
      }
    });

    return clusters;
  }

  calculateChainConfidence(chains) {
    return chains.reduce((sum, chain) => 
      sum + (1 / chain.length), 0
    ) / chains.length;
  }

  calculateClusterConfidence(clusters) {
    return clusters.reduce((sum, cluster) => 
      sum + (cluster.length / 5), 0
    ) / clusters.length;
  }

  calculateRelationshipConfidence(relationships, patterns) {
    const baseConfidence = relationships.length > 0 ? 0.7 : 0.3;
    const patternBonus = patterns.reduce((sum, pattern) => 
      sum + pattern.confidence, 0
    ) / (patterns.length || 1) * 0.3;

    return Math.min(1, baseConfidence + patternBonus);
  }

  detectTimelinePatterns(events) {
    const patterns = [];

    // Find repeated sequences
    const sequences = this.findRepeatedSequences(events);
    if (sequences.length > 0) {
      patterns.push({
        type: 'repeated_sequence',
        sequences,
        confidence: this.calculateSequenceConfidence(sequences)
      });
    }

    // Find periodic events
    const periodic = this.findPeriodicEvents(events);
    if (periodic.length > 0) {
      patterns.push({
        type: 'periodic_events',
        events: periodic,
        confidence: this.calculatePeriodicConfidence(periodic)
      });
    }

    return patterns;
  }

  findRepeatedSequences(events) {
    const sequences = [];
    const minLength = 2;

    for (let i = 0; i < events.length - minLength; i++) {
      for (let j = i + minLength; j <= events.length; j++) {
        const sequence = events.slice(i, j);
        const pattern = sequence.map(e => e.type).join(',');
        
        // Look for this pattern elsewhere
        const matches = this.findPatternMatches(events, pattern, i, j);
        if (matches.length > 0) {
          sequences.push({
            pattern,
            occurrences: [sequence, ...matches]
          });
        }
      }
    }

    return sequences;
  }

  findPatternMatches(events, pattern, start, end) {
    const matches = [];
    const length = end - start;

    for (let i = end; i <= events.length - length; i++) {
      const candidate = events.slice(i, i + length);
      if (candidate.map(e => e.type).join(',') === pattern) {
        matches.push(candidate);
      }
    }

    return matches;
  }

  findPeriodicEvents(events) {
    const periodic = [];
    const typeGroups = new Map();

    // Group events by type
    events.forEach(event => {
      if (!typeGroups.has(event.type)) {
        typeGroups.set(event.type, []);
      }
      typeGroups.get(event.type).push(event);
    });

    // Look for periodic patterns in each group
    typeGroups.forEach((group, type) => {
      if (group.length < 3) return;

      const intervals = [];
      for (let i = 1; i < group.length; i++) {
        intervals.push(
          new Date(group[i].timestamp) - new Date(group[i-1].timestamp)
        );
      }

      // Check if intervals are consistent
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0
      ) / intervals.length;

      if (variance < avgInterval * 0.25) { // Allow 25% variance
        periodic.push({
          type,
          events: group,
          interval: avgInterval,
          confidence: 1 - (variance / (avgInterval * avgInterval))
        });
      }
    });

    return periodic;
  }

  calculateSequenceConfidence(sequences) {
    if (sequences.length === 0) return 0;

    return sequences.reduce((sum, seq) => 
      sum + (seq.occurrences.length / 10), 0
    ) / sequences.length;
  }

  calculatePeriodicConfidence(periodic) {
    if (periodic.length === 0) return 0;

    return periodic.reduce((sum, p) => sum + p.confidence, 0) / periodic.length;
  }

  buildSourceMetadata(sources) {
    const metadata = {};
    
    sources.forEach(source => {
      metadata[source.type] = {
        timestamp: source.metadata.timestamp,
        type: source.type
      };
    });

    return metadata;
  }

  calculateTimeframe(timeline) {
    if (timeline.events.length === 0) {
      return { start: null, end: null };
    }

    const timestamps = timeline.events.map(e => new Date(e.timestamp));
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    };
  }

  calculateConfidence(sourceResults, conflicts) {
    // Base confidence from source validations
    const validationConfidence = sourceResults.reduce((sum, result) => {
      if (!result.metadata?.validation) return sum;
      
      const temporal = result.metadata.validation.temporal.confidence || 0;
      const content = result.metadata.validation.content.confidence || 0;
      return sum + ((temporal + content) / 2);
    }, 0) / sourceResults.length;

    // Adjust for conflicts
    const conflictPenalty = conflicts.length * 0.1;

    return Math.max(0, Math.min(1, validationConfidence - conflictPenalty));
  }

  unifyMessages(sourceResults) {
    const messages = [];
    
    sourceResults.forEach(result => {
      if (result.messages) {
        messages.push(...result.messages.map(msg => ({
          ...msg,
          source: result.type
        })));
      }
    });

    // Sort by timestamp
    return messages.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  determineVerificationStatus(claims, conflicts) {
    const verifiedClaims = claims.filter(c => 
      c.verification.status === 'verified' ||
      c.verification.status === 'corroborated'
    );

    if (verifiedClaims.length === claims.length) {
      return 'verified';
    }
    if (verifiedClaims.length > 0) {
      return 'partially_verified';
    }
    return 'unverified';
  }

  calculateVerificationConfidence(claims, conflicts) {
    // Base confidence from claim verifications
    const claimConfidence = claims.reduce((sum, claim) =>
      sum + (claim.verification.confidence || 0), 0
    ) / claims.length;

    // Adjust for conflicts
    const conflictPenalty = conflicts.length * 0.1;

    return Math.max(0, Math.min(1, claimConfidence - conflictPenalty));
  }

  getVerificationMethods(sourceResults) {
    const methods = new Set();

    sourceResults.forEach(result => {
      if (result.metadata?.validation) {
        Object.keys(result.metadata.validation).forEach(method => {
          methods.add(method);
        });
      }
    });

    return Array.from(methods);
  }
}
