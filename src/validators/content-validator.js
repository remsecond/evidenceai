export class ContentValidator {
  async validate(data) {
    try {
      const issues = [];
      const validations = [];

      // Validate messages if present
      if (data.messages) {
        const messageValidation = this.validateMessages(data.messages);
        validations.push(messageValidation);
        issues.push(...messageValidation.issues);
      }

      // Validate metadata if present
      if (data.metadata) {
        const metadataValidation = this.validateMetadata(data.metadata);
        validations.push(metadataValidation);
        issues.push(...metadataValidation.issues);
      }

      // Calculate overall confidence
      const confidence = validations.length > 0
        ? validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length
        : 0;

      return {
        valid: issues.length === 0,
        issues,
        confidence
      };
    } catch (error) {
      console.error('Content validation error:', error);
      return {
        valid: false,
        issues: [{ type: 'validation_error', message: error.message }],
        confidence: 0
      };
    }
  }

  validateMessages(messages) {
    const issues = [];
    let validCount = 0;

    messages.forEach((message, index) => {
      const messageIssues = this.validateMessage(message);
      
      if (messageIssues.length > 0) {
        issues.push({
          type: 'message_validation',
          message: `Validation issues in message ${index}`,
          messageIndex: index,
          issues: messageIssues
        });
      } else {
        validCount++;
      }
    });

    const confidence = messages.length > 0 ? validCount / messages.length : 0;

    return {
      valid: issues.length === 0,
      issues,
      confidence
    };
  }

  validateMessage(message) {
    const issues = [];

    // Check required fields
    if (!message.id) {
      issues.push({
        type: 'missing_field',
        message: 'Message ID is required'
      });
    }

    if (!message.timestamp) {
      issues.push({
        type: 'missing_field',
        message: 'Message timestamp is required'
      });
    }

    if (!message.content && !message.type) {
      issues.push({
        type: 'missing_field',
        message: 'Message must have either content or type'
      });
    }

    // Validate content if present
    if (message.content) {
      if (typeof message.content !== 'string') {
        issues.push({
          type: 'invalid_content',
          message: 'Message content must be a string'
        });
      } else if (message.content.length === 0) {
        issues.push({
          type: 'empty_content',
          message: 'Message content cannot be empty'
        });
      }
    }

    // Validate references if present
    if (message.references) {
      if (!Array.isArray(message.references)) {
        issues.push({
          type: 'invalid_references',
          message: 'Message references must be an array'
        });
      } else {
        message.references.forEach((ref, index) => {
          if (!ref.type || !ref.content) {
            issues.push({
              type: 'invalid_reference',
              message: `Invalid reference at index ${index}`,
              referenceIndex: index
            });
          }
        });
      }
    }

    // Validate evidence if present
    if (message.evidence) {
      if (!Array.isArray(message.evidence)) {
        issues.push({
          type: 'invalid_evidence',
          message: 'Message evidence must be an array'
        });
      } else {
        message.evidence.forEach((ev, index) => {
          if (!ev.type || !ev.content) {
            issues.push({
              type: 'invalid_evidence',
              message: `Invalid evidence at index ${index}`,
              evidenceIndex: index
            });
          }
        });
      }
    }

    return issues;
  }

  validateMetadata(metadata) {
    const issues = [];

    // Check timeframe if present
    if (metadata.timeframe) {
      if (!metadata.timeframe.start || !metadata.timeframe.end) {
        issues.push({
          type: 'invalid_timeframe',
          message: 'Timeframe must have both start and end timestamps'
        });
      } else {
        const start = new Date(metadata.timeframe.start);
        const end = new Date(metadata.timeframe.end);

        if (isNaN(start.getTime())) {
          issues.push({
            type: 'invalid_timeframe',
            message: 'Invalid timeframe start timestamp'
          });
        }

        if (isNaN(end.getTime())) {
          issues.push({
            type: 'invalid_timeframe',
            message: 'Invalid timeframe end timestamp'
          });
        }

        if (start > end) {
          issues.push({
            type: 'invalid_timeframe',
            message: 'Timeframe start must be before end'
          });
        }
      }
    }

    // Check participants if present
    if (metadata.participants) {
      if (!Array.isArray(metadata.participants)) {
        issues.push({
          type: 'invalid_participants',
          message: 'Participants must be an array'
        });
      } else {
        metadata.participants.forEach((participant, index) => {
          if (typeof participant !== 'string' || participant.length === 0) {
            issues.push({
              type: 'invalid_participant',
              message: `Invalid participant at index ${index}`,
              participantIndex: index
            });
          }
        });
      }
    }

    // Calculate confidence based on completeness
    const requiredFields = ['timeframe', 'participants'];
    const presentFields = requiredFields.filter(field => metadata[field]);
    const confidence = presentFields.length / requiredFields.length;

    return {
      valid: issues.length === 0,
      issues,
      confidence
    };
  }

  validateContent(content) {
    if (typeof content !== 'string') {
      return {
        valid: false,
        issues: [{
          type: 'invalid_content_type',
          message: 'Content must be a string'
        }],
        confidence: 0
      };
    }

    const issues = [];
    let confidence = 1;

    // Check for minimum length
    if (content.length < 10) {
      issues.push({
        type: 'content_too_short',
        message: 'Content is too short'
      });
      confidence -= 0.3;
    }

    // Check for maximum length
    if (content.length > 10000) {
      issues.push({
        type: 'content_too_long',
        message: 'Content exceeds maximum length'
      });
      confidence -= 0.2;
    }

    // Check for empty lines
    const emptyLines = content.split('\n').filter(line => line.trim().length === 0);
    if (emptyLines.length > content.split('\n').length / 2) {
      issues.push({
        type: 'excessive_empty_lines',
        message: 'Content contains too many empty lines'
      });
      confidence -= 0.1;
    }

    // Check for repeated content
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    const maxFreq = Math.max(...wordFreq.values());
    if (maxFreq > words.length / 4) {
      issues.push({
        type: 'repetitive_content',
        message: 'Content contains excessive repetition'
      });
      confidence -= 0.2;
    }

    return {
      valid: issues.length === 0,
      issues,
      confidence: Math.max(0, confidence)
    };
  }
}
