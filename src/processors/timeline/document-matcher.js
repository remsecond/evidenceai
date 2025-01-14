import { getLogger } from '../../utils/logging.js';

const logger = getLogger('DocumentMatcher');

/**
 * Service for advanced document matching and relationship detection
 */
class DocumentMatcher {
  /**
   * Match documents based on content and metadata
   * @param {Array<DocumentEntity>} documents - Documents to analyze
   * @returns {Promise<Array<{source: string, target: string, confidence: number, type: string}>>}
   */
  async findRelationships(documents) {
    try {
      const relationships = [];

      // Validate and filter documents by type
      const emailDocs = documents.filter(doc => {
        if (!doc.classification || !doc.classification.type) {
          logger.warn(`Document ${doc.id} missing classification`);
          return false;
        }
        return doc.classification.type === 'email_pdf';
      });

      const recordDocs = documents.filter(doc => {
        if (!doc.classification || !doc.classification.type) {
          logger.warn(`Document ${doc.id} missing classification`);
          return false;
        }
        return doc.classification.type === 'record_table';
      });

      const attachmentDocs = documents.filter(doc => {
        if (!doc.classification || !doc.classification.type) {
          logger.warn(`Document ${doc.id} missing classification`);
          return false;
        }
        return doc.classification.type === 'attachment';
      });

      logger.info('Document counts:', {
        emails: emailDocs.length,
        records: recordDocs.length,
        attachments: attachmentDocs.length
      });

      // Match emails with record entries
      if (recordDocs.length > 0) {
        const recordDoc = recordDocs[0]; // Assuming one record table
        for (const email of emailDocs) {
          const match = await this.matchEmailToRecord(email, recordDoc);
          if (match.confidence > 0.7) {
            relationships.push({
              source: email.id,
              target: recordDoc.id,
              confidence: match.confidence,
              type: 'email_record',
              metadata: match.metadata
            });
            logger.info(`Found email-record match: ${email.id} -> ${recordDoc.id} (${match.confidence})`);
          }
        }
      }

      // Match attachments to emails
      for (const attachment of attachmentDocs) {
        const bestMatch = await this.findBestEmailMatch(attachment, emailDocs);
        if (bestMatch) {
          relationships.push({
            source: attachment.id,
            target: bestMatch.email.id,
            confidence: bestMatch.confidence,
            type: 'email_attachment',
            metadata: bestMatch.metadata
          });
          logger.info(`Found attachment-email match: ${attachment.id} -> ${bestMatch.email.id} (${bestMatch.confidence})`);
        }
      }

      return relationships;
    } catch (error) {
      logger.error('Error finding relationships', error);
      return [];
    }
  }

  /**
   * Match an email to a record table entry
   * @param {DocumentEntity} email - Email document
   * @param {DocumentEntity} record - Record table document
   * @returns {Promise<{confidence: number, metadata: Object}>}
   */
  async matchEmailToRecord(email, record) {
    try {
      // Validate document types
      if (email.classification.type !== 'email_pdf') {
        throw new Error('Invalid email document type');
      }
      if (record.classification.type !== 'record_table') {
        throw new Error('Invalid record document type');
      }

      // Extract key fields from email and record
      const emailFields = await this.extractEmailFields(email);
      const recordFields = await this.extractRecordFields(record);

      // Return low confidence if either extraction failed
      if (!emailFields || !recordFields) {
        return {
          confidence: 0,
          metadata: {
            matchedFields: [],
            reason: 'field_extraction_failed'
          }
        };
      }

      const matches = {
        subject: this.compareFields(emailFields.subject, recordFields.subject),
        from: this.compareFields(emailFields.from, recordFields.from),
        to: this.compareFields(emailFields.to, recordFields.to),
        date: this.compareDates(emailFields.date, recordFields.date)
      };

      // Calculate confidence
      const validScores = Object.values(matches).filter(score => !isNaN(score));
      const confidence = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : 0;

      return {
        confidence,
        metadata: {
          matchedFields: Object.entries(matches)
            .filter(([_, score]) => score > 0.8)
            .map(([field]) => field),
          reason: confidence > 0.7 ? 'strong_field_match' : 'weak_field_match'
        }
      };
    } catch (error) {
      logger.error('Error matching email to record', error);
      return {
        confidence: 0,
        metadata: {
          matchedFields: [],
          reason: 'matching_error'
        }
      };
    }
  }

  /**
   * Find best matching email for an attachment
   * @param {DocumentEntity} attachment - Attachment document
   * @param {Array<DocumentEntity>} emails - Email documents
   * @returns {Promise<{email: DocumentEntity, confidence: number, metadata: Object}|null>}
   */
  async findBestEmailMatch(attachment, emails) {
    try {
      // Validate document type
      if (attachment.classification.type !== 'attachment') {
        throw new Error('Invalid attachment document type');
      }

      let bestMatch = null;
      let highestConfidence = 0;

      for (const email of emails) {
        // Validate email type
        if (email.classification.type !== 'email_pdf') {
          logger.warn(`Skipping invalid email document: ${email.id}`);
          continue;
        }

        const confidence = await this.calculateAttachmentMatch(attachment, email);
        if (confidence > highestConfidence && confidence > 0.6) {
          bestMatch = {
            email,
            confidence,
            metadata: {
              matchReason: 'content_similarity'
            }
          };
          highestConfidence = confidence;
        }
      }

      return bestMatch;
    } catch (error) {
      logger.error('Error finding best email match', error);
      return null;
    }
  }

  /**
   * Calculate match confidence between attachment and email
   * @param {DocumentEntity} attachment - Attachment document
   * @param {DocumentEntity} email - Email document
   * @returns {Promise<number>}
   */
  async calculateAttachmentMatch(attachment, email) {
    try {
      // Extract content
      const attachmentContent = await this.extractContent(attachment);
      const emailContent = await this.extractContent(email);

      // Return no match if either content extraction failed
      if (!attachmentContent || !emailContent) {
        logger.info(`Content extraction failed for attachment match: ${attachment.id} -> ${email.id}`);
        return 0;
      }

      // Calculate individual scores
      const scores = {
        // 1. Filename mentions in email (40%)
        filename: this.calculateFilenameMatch(
          attachment.originalName,
          emailContent
        ),

        // 2. Content similarity (40%)
        content: this.calculateContentSimilarity(
          attachmentContent,
          emailContent
        ),

        // 3. Temporal proximity (20%)
        temporal: this.calculateTemporalProximity(
          attachment.fingerprint.creationSignature,
          email.fingerprint.creationSignature
        )
      };

      // Log individual scores for debugging
      logger.info('Attachment match scores:', {
        attachmentId: attachment.id,
        emailId: email.id,
        scores
      });

      // Weight and combine scores
      const weightedScore = (scores.filename * 0.4) + 
                          (scores.content * 0.4) + 
                          (scores.temporal * 0.2);

      return weightedScore;
    } catch (error) {
      logger.error('Error calculating attachment match', error);
      return 0;
    }
  }

  /**
   * Extract fields from email content
   * @param {DocumentEntity} email - Email document
   * @returns {Promise<Object>}
   */
  async extractEmailFields(email) {
    try {
      const contentExtractor = (await import('./content-extractor.js')).default;
      const content = await contentExtractor.extractEmailContent(email);
      const fields = contentExtractor.extractEmailFields(content);
      
      return fields || {
        subject: '',
        from: '',
        to: '',
        date: null
      };
    } catch (error) {
      logger.error('Error extracting email fields', error);
      return null;
    }
  }

  /**
   * Extract fields from record content
   * @param {DocumentEntity} record - Record document
   * @returns {Promise<Object>}
   */
  async extractRecordFields(record) {
    try {
      const contentExtractor = (await import('./content-extractor.js')).default;
      const content = await contentExtractor.extractRecordContent(record);
      const fields = contentExtractor.extractRecordFields(content);
      
      return fields || {
        subject: '',
        from: '',
        to: '',
        date: null
      };
    } catch (error) {
      logger.error('Error extracting record fields', error);
      return null;
    }
  }

  /**
   * Extract content from document
   * @param {DocumentEntity} document - Document to extract content from
   * @returns {Promise<string>}
   */
  async extractContent(document) {
    try {
      const contentExtractor = (await import('./content-extractor.js')).default;
      const content = await contentExtractor.extractContent(document);
      
      // Ensure we have valid content
      if (!content || content.trim().length === 0) {
        throw new Error('No valid content extracted');
      }
      
      return content;
    } catch (error) {
      logger.error('Error extracting content', error);
      return null;
    }
  }

  /**
   * Compare two field values
   * @param {string} field1 - First field value
   * @param {string} field2 - Second field value
   * @returns {number} Similarity score (0-1)
   */
  compareFields(field1, field2) {
    if (!field1 || !field2) return 0;
    
    // Normalize fields
    const norm1 = field1.toLowerCase().trim();
    const norm2 = field2.toLowerCase().trim();

    if (norm1 === norm2) return 1;

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Compare two dates
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {number} Similarity score (0-1)
   */
  compareDates(date1, date2) {
    if (!date1 || !date2) return 0;

    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);

    // Score decreases as time difference increases
    return Math.max(0, 1 - (diffHours / 24));
  }

  /**
   * Calculate filename match score
   * @param {string} filename - Attachment filename
   * @param {string} emailContent - Email content
   * @returns {number} Match score (0-1)
   */
  calculateFilenameMatch(filename, emailContent) {
    if (!filename || !emailContent) return 0;

    const normalizedFilename = filename.toLowerCase();
    const normalizedContent = emailContent.toLowerCase();

    // Check for exact filename match
    if (normalizedContent.includes(normalizedFilename)) {
      return 1;
    }

    // Check for partial matches
    const parts = normalizedFilename.split(/[._-\s]/);
    const matchingParts = parts.filter(part => 
      part.length > 3 && normalizedContent.includes(part)
    );

    return matchingParts.length / parts.length;
  }

  /**
   * Calculate content similarity
   * @param {string} content1 - First content
   * @param {string} content2 - Second content
   * @returns {number} Similarity score (0-1)
   */
  calculateContentSimilarity(content1, content2) {
    if (!content1 || !content2) return 0;

    // Extract key phrases (words longer than 4 chars)
    const words1 = new Set(
      content1.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 4)
    );
    const words2 = new Set(
      content2.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 4)
    );

    // Calculate Jaccard similarity
    const intersection = new Set(
      [...words1].filter(word => words2.has(word))
    );
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate temporal proximity
   * @param {string} timestamp1 - First ISO timestamp
   * @param {string} timestamp2 - Second ISO timestamp
   * @returns {number} Proximity score (0-1)
   */
  calculateTemporalProximity(timestamp1, timestamp2) {
    if (!timestamp1 || !timestamp2) return 0;

    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    
    return this.compareDates(date1, date2);
  }

  /**
   * Calculate Levenshtein distance between strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1,  // substitution
            dp[i - 1][j] + 1,      // deletion
            dp[i][j - 1] + 1       // insertion
          );
        }
      }
    }

    return dp[m][n];
  }
}

export default new DocumentMatcher();
