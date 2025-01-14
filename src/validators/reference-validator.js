export class ReferenceValidator {
  async validate(data) {
    try {
      const issues = [];
      const validations = [];

      // Validate message references if present
      if (data.messages) {
        const referenceValidation = this.validateMessageReferences(data.messages);
        validations.push(referenceValidation);
        issues.push(...referenceValidation.issues);
      }

      // Validate evidence references if present
      if (data.evidence) {
        const evidenceValidation = this.validateEvidenceReferences(data.evidence);
        validations.push(evidenceValidation);
        issues.push(...evidenceValidation.issues);
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
      console.error('Reference validation error:', error);
      return {
        valid: false,
        issues: [{ type: 'validation_error', message: error.message }],
        confidence: 0
      };
    }
  }

  validateMessageReferences(messages) {
    const issues = [];
    const messageIds = new Set(messages.map(m => m.id));
    let validCount = 0;

    messages.forEach((message, index) => {
      if (message.references) {
        const referenceIssues = this.validateReferences(
          message.references,
          messageIds,
          index
        );

        if (referenceIssues.length > 0) {
          issues.push({
            type: 'message_references',
            message: `Reference issues in message ${index}`,
            messageIndex: index,
            issues: referenceIssues
          });
        } else {
          validCount++;
        }
      }
    });

    const referencingMessages = messages.filter(m => m.references?.length > 0);
    const confidence = referencingMessages.length > 0
      ? validCount / referencingMessages.length
      : 1;

    return {
      valid: issues.length === 0,
      issues,
      confidence
    };
  }

  validateReferences(references, validIds, messageIndex) {
    const issues = [];

    references.forEach((ref, index) => {
      // Check reference format
      if (!ref.type || !ref.content) {
        issues.push({
          type: 'invalid_reference_format',
          message: `Invalid reference format at index ${index}`,
          referenceIndex: index
        });
        return;
      }

      // Check reference type
      if (!this.isValidReferenceType(ref.type)) {
        issues.push({
          type: 'invalid_reference_type',
          message: `Invalid reference type "${ref.type}" at index ${index}`,
          referenceIndex: index
        });
      }

      // Check reference content
      if (typeof ref.content !== 'string' || ref.content.length === 0) {
        issues.push({
          type: 'invalid_reference_content',
          message: `Invalid reference content at index ${index}`,
          referenceIndex: index
        });
      }

      // Check if referenced message exists
      if (ref.type === 'message' && !validIds.has(ref.content)) {
        issues.push({
          type: 'missing_referenced_message',
          message: `Referenced message "${ref.content}" not found`,
          referenceIndex: index
        });
      }
    });

    return issues;
  }

  validateEvidenceReferences(evidence) {
    const issues = [];
    let validCount = 0;

    evidence.forEach((ev, index) => {
      const evidenceIssues = this.validateEvidence(ev, index);

      if (evidenceIssues.length > 0) {
        issues.push({
          type: 'evidence_validation',
          message: `Evidence issues at index ${index}`,
          evidenceIndex: index,
          issues: evidenceIssues
        });
      } else {
        validCount++;
      }
    });

    const confidence = evidence.length > 0 ? validCount / evidence.length : 1;

    return {
      valid: issues.length === 0,
      issues,
      confidence
    };
  }

  validateEvidence(evidence, index) {
    const issues = [];

    // Check evidence format
    if (!evidence.type || !evidence.content) {
      issues.push({
        type: 'invalid_evidence_format',
        message: `Invalid evidence format at index ${index}`
      });
      return issues;
    }

    // Check evidence type
    if (!this.isValidEvidenceType(evidence.type)) {
      issues.push({
        type: 'invalid_evidence_type',
        message: `Invalid evidence type "${evidence.type}" at index ${index}`
      });
    }

    // Check evidence content
    if (typeof evidence.content !== 'string' || evidence.content.length === 0) {
      issues.push({
        type: 'invalid_evidence_content',
        message: `Invalid evidence content at index ${index}`
      });
    }

    // Validate based on evidence type
    switch (evidence.type) {
      case 'attachment':
        if (!this.isValidAttachmentReference(evidence.content)) {
          issues.push({
            type: 'invalid_attachment_reference',
            message: `Invalid attachment reference at index ${index}`
          });
        }
        break;
      case 'quote':
        if (!this.isValidQuote(evidence.content)) {
          issues.push({
            type: 'invalid_quote',
            message: `Invalid quote at index ${index}`
          });
        }
        break;
      case 'link':
        if (!this.isValidLink(evidence.content)) {
          issues.push({
            type: 'invalid_link',
            message: `Invalid link at index ${index}`
          });
        }
        break;
    }

    return issues;
  }

  isValidReferenceType(type) {
    const validTypes = ['message', 'quote', 'link', 'attachment'];
    return validTypes.includes(type);
  }

  isValidEvidenceType(type) {
    const validTypes = ['attachment', 'quote', 'link', 'screenshot'];
    return validTypes.includes(type);
  }

  isValidAttachmentReference(content) {
    // Check if content matches attachment ID format
    return /^att-\d+-[a-z0-9]+$/.test(content);
  }

  isValidQuote(content) {
    // Check if content is a reasonable quote length
    return content.length >= 10 && content.length <= 1000;
  }

  isValidLink(content) {
    try {
      new URL(content);
      return true;
    } catch {
      return false;
    }
  }

  validateReferenceChain(messages) {
    const issues = [];
    const chains = this.findReferenceChains(messages);
    let confidence = 1;

    // Check for circular references
    chains.forEach((chain, index) => {
      if (this.hasCircularReference(chain)) {
        issues.push({
          type: 'circular_reference',
          message: `Circular reference detected in chain ${index}`,
          chain
        });
        confidence -= 0.2;
      }
    });

    // Check for broken chains
    chains.forEach((chain, index) => {
      const brokenLinks = this.findBrokenLinks(chain, messages);
      if (brokenLinks.length > 0) {
        issues.push({
          type: 'broken_chain',
          message: `Broken reference chain at index ${index}`,
          chain,
          brokenLinks
        });
        confidence -= 0.1 * brokenLinks.length;
      }
    });

    // Check for deep chains
    const MAX_CHAIN_DEPTH = 5;
    chains.forEach((chain, index) => {
      if (chain.length > MAX_CHAIN_DEPTH) {
        issues.push({
          type: 'deep_chain',
          message: `Reference chain too deep at index ${index}`,
          chain
        });
        confidence -= 0.1;
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      confidence: Math.max(0, confidence)
    };
  }

  findReferenceChains(messages) {
    const chains = [];
    const messageMap = new Map(messages.map(m => [m.id, m]));

    messages.forEach(message => {
      if (message.references) {
        message.references
          .filter(ref => ref.type === 'message')
          .forEach(ref => {
            const chain = this.buildChain(message, ref.content, messageMap);
            if (chain.length > 1) {
              chains.push(chain);
            }
          });
      }
    });

    return chains;
  }

  buildChain(startMessage, referenceId, messageMap, chain = []) {
    if (chain.includes(startMessage.id)) {
      return chain; // Prevent infinite recursion
    }

    chain.push(startMessage.id);
    const referencedMessage = messageMap.get(referenceId);

    if (!referencedMessage) {
      return chain;
    }

    chain.push(referencedMessage.id);

    if (referencedMessage.references) {
      referencedMessage.references
        .filter(ref => ref.type === 'message')
        .forEach(ref => {
          this.buildChain(referencedMessage, ref.content, messageMap, chain);
        });
    }

    return chain;
  }

  hasCircularReference(chain) {
    const seen = new Set();
    for (const id of chain) {
      if (seen.has(id)) {
        return true;
      }
      seen.add(id);
    }
    return false;
  }

  findBrokenLinks(chain, messages) {
    const messageIds = new Set(messages.map(m => m.id));
    return chain.filter(id => !messageIds.has(id));
  }
}
