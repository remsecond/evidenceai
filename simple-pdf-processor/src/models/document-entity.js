import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../utils/logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = getLogger('DocumentEntity');

/**
 * Represents a document as a first-class entity in the system
 */
class DocumentEntity {
  /**
   * Create a new document entity
   * @param {Object} file - File object from multer upload
   * @param {string} file.path - Path to the file
   * @param {string} file.originalname - Original file name
   */
  constructor(file) {
    this.id = this.generateId();
    this.originalName = file.originalname;
    this.path = file.path;
    this.fingerprint = this.generateFingerprint(file);
    this.classification = this.classifyDocument(file);
    this.relationships = {
      companions: [],
      context: []
    };
    logger.info(`Created document entity for ${file.originalname}`);
  }

  /**
   * Generate a unique document ID
   * @returns {string} UUID v4
   */
  generateId() {
    return crypto.randomUUID();
  }

  /**
   * Generate document fingerprint
   * @param {Object} file - File object
   * @returns {Object} Document fingerprint
   */
  generateFingerprint(file) {
    const content = fs.readFileSync(file.path);
    const stats = fs.statSync(file.path);
    
    return {
      contentHash: crypto.createHash('sha256').update(content).digest('hex'),
      metadataHash: crypto.createHash('sha256')
        .update(JSON.stringify({
          name: file.originalname,
          size: stats.size,
          mtime: stats.mtime
        }))
        .digest('hex'),
      creationSignature: new Date().toISOString()
    };
  }

  /**
   * Classify the document based on content and format
   * @param {Object} file - File object
   * @returns {Object} Document classification
   */
  classifyDocument(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    return {
      type: null,  // Will be set by content analysis
      format: ext.slice(1),  // Remove the dot
      context: null  // Will be set during processing
    };
  }

  /**
   * Add a companion document relationship
   * @param {string} companionId - ID of companion document
   */
  addCompanion(companionId) {
    if (!this.relationships.companions.includes(companionId)) {
      this.relationships.companions.push(companionId);
      logger.info(`Added companion ${companionId} to ${this.id}`);
    }
  }

  /**
   * Add a context document relationship
   * @param {string} contextId - ID of context document
   */
  addContext(contextId) {
    if (!this.relationships.context.includes(contextId)) {
      this.relationships.context.push(contextId);
      logger.info(`Added context ${contextId} to ${this.id}`);
    }
  }

  /**
   * Update document classification
   * @param {Object} classification - New classification
   */
  updateClassification(classification) {
    this.classification = {
      ...this.classification,
      ...classification
    };
    logger.info(`Updated classification for ${this.id}`, classification);
  }

  /**
   * Convert to JSON representation
   * @returns {Object} JSON representation of document
   */
  toJSON() {
    return {
      id: this.id,
      originalName: this.originalName,
      fingerprint: this.fingerprint,
      classification: this.classification,
      relationships: this.relationships
    };
  }
}

export default DocumentEntity;
