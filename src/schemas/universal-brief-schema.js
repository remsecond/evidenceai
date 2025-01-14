/**
 * Universal Brief Schema
 * 
 * A consistent data structure for representing processed information
 * regardless of source availability. Designed to gracefully handle
 * missing data while maintaining a uniform interface for LLMs.
 */

class UniversalBrief {
  constructor() {
    this.metadata = {
      timestamp: new Date().toISOString(),
      sources: {
        ofw: { available: false },
        email: { available: false },
        table: { available: false }
      },
      confidence: {
        overall: 0,
        temporal: 0,
        contextual: 0
      }
    };

    this.content = {
      messages: [],
      relationships: {
        present: false,
        data: []
      },
      timeline: {
        present: false,
        events: []
      },
      analysis: {
        present: false,
        summary: "No analysis available - insufficient data",
        keyPoints: [],
        confidence: 0
      }
    };
  }

  /**
   * Update source availability and counts
   */
  setSourceAvailability(source, available, count = 0) {
    if (this.metadata.sources[source]) {
      this.metadata.sources[source] = {
        available,
        ...(count > 0 && { count })
      };
      this._updateConfidenceScores();
    }
  }

  /**
   * Add a message from any source
   */
  addMessage(message) {
    const { id, timestamp, content, source, confidence = 0.5 } = message;
    
    this.content.messages.push({
      id,
      timestamp,
      content,
      source,
      confidence,
      attachments: message.attachments || { present: false },
      metadata: message.metadata || { present: false }
    });

    this._updateConfidenceScores();
  }

  /**
   * Add relationship data
   */
  addRelationship(relationship) {
    const { type, entities, confidence = 0.5 } = relationship;
    
    if (!this.content.relationships.present) {
      this.content.relationships.present = true;
    }

    this.content.relationships.data.push({
      type,
      entities,
      confidence
    });

    this._updateConfidenceScores();
  }

  /**
   * Add timeline event
   */
  addTimelineEvent(event) {
    const { timestamp, description, sources, confidence = 0.5 } = event;
    
    if (!this.content.timeline.present) {
      this.content.timeline.present = true;
    }

    this.content.timeline.events.push({
      timestamp,
      description,
      sources,
      confidence
    });

    this._updateConfidenceScores();
  }

  /**
   * Update analysis section
   */
  setAnalysis(analysis) {
    const { summary, keyPoints = [], confidence = 0.5 } = analysis;
    
    this.content.analysis = {
      present: true,
      summary,
      keyPoints,
      confidence
    };

    this._updateConfidenceScores();
  }

  /**
   * Calculate confidence scores based on available data
   */
  _updateConfidenceScores() {
    // Count available sources
    const availableSources = Object.values(this.metadata.sources)
      .filter(s => s.available).length;
    
    // Base confidence on source availability
    const sourceWeight = availableSources / 3;

    // Calculate temporal confidence
    const temporalConfidence = this.content.timeline.present
      ? this.content.timeline.events.reduce((acc, evt) => acc + evt.confidence, 0) / 
        Math.max(this.content.timeline.events.length, 1)
      : 0;

    // Calculate contextual confidence
    const relationshipConfidence = this.content.relationships.present
      ? this.content.relationships.data.reduce((acc, rel) => acc + rel.confidence, 0) / 
        Math.max(this.content.relationships.data.length, 1)
      : 0;

    const messageConfidence = this.content.messages.length > 0
      ? this.content.messages.reduce((acc, msg) => acc + msg.confidence, 0) / 
        this.content.messages.length
      : 0;

    // Update confidence scores
    this.metadata.confidence = {
      overall: (sourceWeight * 0.4) + (messageConfidence * 0.3) + 
               (temporalConfidence * 0.15) + (relationshipConfidence * 0.15),
      temporal: temporalConfidence,
      contextual: (messageConfidence * 0.6) + (relationshipConfidence * 0.4)
    };
  }

  /**
   * Generate a standardized prompt for LLMs
   */
  generatePrompt() {
    const availableSources = Object.entries(this.metadata.sources)
      .filter(([_, info]) => info.available)
      .map(([source, _]) => source.toUpperCase())
      .join(', ');

    return `You are analyzing a communication dataset with the following characteristics:

Available Sources: ${availableSources || 'None'}
Overall Confidence: ${(this.metadata.confidence.overall * 100).toFixed(1)}%
Temporal Confidence: ${(this.metadata.confidence.temporal * 100).toFixed(1)}%
Contextual Confidence: ${(this.metadata.confidence.contextual * 100).toFixed(1)}%

The brief includes all available information. Consider:
1. Overall confidence scores when weighing information
2. Source availability when making inferences
3. Explicit gaps in data when drawing conclusions

Brief: ${JSON.stringify(this, null, 2)}

Based on the available information, provide your analysis...`;
  }

  /**
   * Validate brief completeness
   */
  validate() {
    const issues = [];

    // Check if any sources are available
    if (!Object.values(this.metadata.sources).some(s => s.available)) {
      issues.push('No data sources available');
    }

    // Check for minimum required data
    if (this.content.messages.length === 0) {
      issues.push('No messages present');
    }

    // Check confidence thresholds
    if (this.metadata.confidence.overall < 0.2) {
      issues.push('Overall confidence too low');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Convert to JSON string
   */
  toString() {
    return JSON.stringify(this, null, 2);
  }
}

module.exports = UniversalBrief;
