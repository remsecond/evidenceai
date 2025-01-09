import { validateBaseSchema } from '../schemas/base-schema.js';

/**
 * Base processor class that implements core validation and processing logic.
 * Other processors (PDF, email, etc.) should extend this class.
 */
export class BaseProcessor {
  constructor() {
    this.processingSteps = {
      VALIDATION: 'validation',
      CLEANING: 'cleaning',
      ENRICHMENT: 'enrichment',
      MODEL_PROCESSING: 'model_processing'
    };
  }

  /**
   * Validate data against the base schema
   * @param {Object} data - The data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  async validateData(data) {
    try {
      const result = validateBaseSchema(data);
      if (!result.isValid) {
        console.error('Validation errors:', result.errors);
      }
      return result;
    } catch (error) {
      console.error('Error during validation:', error);
      return {
        isValid: false,
        errors: [{ message: error.message }]
      };
    }
  }

  /**
   * Create a base document structure
   * @param {string} sourceFile - Path or identifier of the source file
   * @returns {Object} Base document structure
   */
  createBaseDocument(sourceFile) {
    return {
      thread_id: `thread_${Date.now()}`,
      timeline: {
        events: []
      },
      relationships: {
        participant_network: {},
        topic_links: {}
      },
      metadata: {
        source_file: sourceFile,
        validation_status: 'pending',
        processing_timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Add an event to the timeline
   * @param {Object} doc - The document to add the event to
   * @param {Object} event - The event to add
   * @returns {Object} Updated document
   */
  addTimelineEvent(doc, event) {
    const baseEvent = {
      timestamp: new Date().toISOString(),
      type: 'event',
      content: '',
      participants: [],
      topics: []
    };

    doc.timeline.events.push({
      ...baseEvent,
      ...event
    });

    return doc;
  }

  /**
   * Add a relationship between participants
   * @param {Object} doc - The document to add the relationship to
   * @param {string} participant1 - First participant
   * @param {string} participant2 - Second participant
   * @param {string} relationshipType - Type of relationship
   * @returns {Object} Updated document
   */
  addParticipantRelationship(doc, participant1, participant2, relationshipType) {
    if (!doc.relationships.participant_network[participant1]) {
      doc.relationships.participant_network[participant1] = {};
    }
    
    doc.relationships.participant_network[participant1][participant2] = relationshipType;
    return doc;
  }

  /**
   * Add a relationship between topics
   * @param {Object} doc - The document to add the relationship to
   * @param {string} topic1 - First topic
   * @param {string} topic2 - Second topic
   * @param {string} relationshipType - Type of relationship
   * @returns {Object} Updated document
   */
  addTopicRelationship(doc, topic1, topic2, relationshipType) {
    if (!doc.relationships.topic_links[topic1]) {
      doc.relationships.topic_links[topic1] = {};
    }
    
    doc.relationships.topic_links[topic1][topic2] = relationshipType;
    return doc;
  }

  /**
   * Update document validation status
   * @param {Object} doc - The document to update
   * @param {string} status - New validation status
   * @returns {Object} Updated document
   */
  updateValidationStatus(doc, status) {
    doc.metadata.validation_status = status;
    doc.metadata.processing_timestamp = new Date().toISOString();
    return doc;
  }

  /**
   * Process a document through all phases
   * @param {string} sourceFile - Path or identifier of the source file
   * @returns {Promise<Object>} Processed document
   */
  async process(sourceFile) {
    try {
      // Create base document structure
      let doc = this.createBaseDocument(sourceFile);

      // Validation phase
      const validationResult = await this.validateData(doc);
      if (!validationResult.isValid) {
        doc = this.updateValidationStatus(doc, 'invalid');
        return doc;
      }

      // Mark as valid
      doc = this.updateValidationStatus(doc, 'valid');
      return doc;

    } catch (error) {
      console.error('Error during processing:', error);
      throw error;
    }
  }
}

export default BaseProcessor;
