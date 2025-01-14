export class TemporalValidator {
  async validate(data) {
    try {
      const timestamps = this.extractTimestamps(data);
      const issues = this.findTemporalIssues(timestamps);
      const confidence = this.calculateConfidence(timestamps, issues);

      return {
        valid: issues.length === 0,
        issues,
        confidence
      };
    } catch (error) {
      console.error('Temporal validation error:', error);
      return {
        valid: false,
        issues: [{ type: 'validation_error', message: error.message }],
        confidence: 0
      };
    }
  }

  async validateTimeline(events) {
    try {
      const timestamps = events.map(e => new Date(e.timestamp));
      const gaps = this.findTimelineGaps(timestamps);
      const issues = this.findTimelineIssues(events);
      const confidence = this.calculateTimelineConfidence(events, gaps, issues);

      return {
        valid: issues.length === 0,
        gaps,
        issues,
        confidence
      };
    } catch (error) {
      console.error('Timeline validation error:', error);
      return {
        valid: false,
        issues: [{ type: 'validation_error', message: error.message }],
        confidence: 0
      };
    }
  }

  extractTimestamps(data) {
    const timestamps = [];

    if (data.messages) {
      timestamps.push(...data.messages.map(msg => new Date(msg.timestamp)));
    }

    if (data.metadata?.timeframe) {
      if (data.metadata.timeframe.start) {
        timestamps.push(new Date(data.metadata.timeframe.start));
      }
      if (data.metadata.timeframe.end) {
        timestamps.push(new Date(data.metadata.timeframe.end));
      }
    }

    return timestamps;
  }

  findTemporalIssues(timestamps) {
    const issues = [];

    // Check for invalid dates
    timestamps.forEach((timestamp, index) => {
      if (isNaN(timestamp)) {
        issues.push({
          type: 'invalid_timestamp',
          message: `Invalid timestamp at index ${index}`
        });
      }
    });

    // Check for future dates
    const now = new Date();
    timestamps.forEach((timestamp, index) => {
      if (timestamp > now) {
        issues.push({
          type: 'future_timestamp',
          message: `Timestamp at index ${index} is in the future`
        });
      }
    });

    // Check for chronological order
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < timestamps[i-1]) {
        issues.push({
          type: 'chronological_order',
          message: `Timestamp at index ${i} is earlier than the previous timestamp`
        });
      }
    }

    return issues;
  }

  findTimelineGaps(timestamps) {
    const gaps = [];
    const MAX_GAP = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i-1];
      if (gap > MAX_GAP) {
        gaps.push({
          start: timestamps[i-1],
          end: timestamps[i],
          duration: gap
        });
      }
    }

    return gaps;
  }

  findTimelineIssues(events) {
    const issues = [];

    // Check for overlapping events
    for (let i = 1; i < events.length; i++) {
      const current = new Date(events[i].timestamp);
      const previous = new Date(events[i-1].timestamp);

      if (current < previous) {
        issues.push({
          type: 'event_overlap',
          message: `Event at index ${i} overlaps with previous event`,
          events: [events[i-1], events[i]]
        });
      }
    }

    // Check for duplicate timestamps
    const timestampMap = new Map();
    events.forEach((event, index) => {
      const timestamp = event.timestamp;
      if (timestampMap.has(timestamp)) {
        issues.push({
          type: 'duplicate_timestamp',
          message: `Event at index ${index} has same timestamp as event at index ${timestampMap.get(timestamp)}`,
          events: [events[timestampMap.get(timestamp)], event]
        });
      } else {
        timestampMap.set(timestamp, index);
      }
    });

    return issues;
  }

  calculateConfidence(timestamps, issues) {
    if (timestamps.length === 0) return 0;
    if (issues.length === 0) return 1;

    // Base confidence starts at 1 and decreases with each issue
    let confidence = 1;

    // Each issue type has a different impact
    issues.forEach(issue => {
      switch (issue.type) {
        case 'invalid_timestamp':
          confidence -= 0.3;
          break;
        case 'future_timestamp':
          confidence -= 0.2;
          break;
        case 'chronological_order':
          confidence -= 0.1;
          break;
        default:
          confidence -= 0.05;
      }
    });

    return Math.max(0, confidence);
  }

  calculateTimelineConfidence(events, gaps, issues) {
    if (events.length === 0) return 0;

    let confidence = 1;

    // Adjust for gaps
    if (gaps.length > 0) {
      const gapPenalty = Math.min(0.3, gaps.length * 0.1);
      confidence -= gapPenalty;
    }

    // Adjust for issues
    if (issues.length > 0) {
      const issuePenalty = Math.min(0.5, issues.length * 0.15);
      confidence -= issuePenalty;
    }

    // Adjust for timeline density
    const timespan = new Date(events[events.length - 1].timestamp) - new Date(events[0].timestamp);
    const density = events.length / (timespan / (24 * 60 * 60 * 1000)); // events per day
    if (density < 0.1) { // Less than 1 event per 10 days
      confidence -= 0.2;
    }

    return Math.max(0, confidence);
  }
}
