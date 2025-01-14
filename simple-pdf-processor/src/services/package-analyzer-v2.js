import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../utils/logging.js';
import DocumentEntity from '../models/document-entity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = getLogger('PackageAnalyzer');

/**
 * Analyzes uploaded files using document-centric approach
 */
class PackageAnalyzer {
  /**
   * Analyze a set of uploaded files
   * @param {Array<{path: string, originalname: string}>} files - Uploaded files
   * @returns {Promise<{type: string, documents: Object}>}
   */
  async analyzeUpload(files) {
    logger.info(`Analyzing upload package of ${files.length} files`);
    
    // Create document entities
    const documents = await Promise.all(
      files.map(file => this.createDocument(file))
    );

    // Analyze package type
    const packageType = await this.determinePackageType(documents);
    
    // Build relationships based on package type
    await this.buildRelationships(documents, packageType);

    logger.info(`Package analysis complete: ${packageType}`);
    return {
      type: packageType,
      documents: this.groupDocuments(documents, packageType)
    };
  }

  /**
   * Create a document entity with initial classification
   * @param {Object} file - File object
   * @returns {Promise<DocumentEntity>}
   */
  async createDocument(file) {
    const doc = new DocumentEntity(file);
    
    // Initial classification
    if (await this.isEmailPdf(file.path)) {
      doc.updateClassification({
        type: 'email_pdf',
        context: 'email_content'
      });
    } else if (await this.isRecordTable(file.path)) {
      doc.updateClassification({
        type: 'record_table',
        context: 'metadata'
      });
    } else {
      doc.updateClassification({
        type: 'attachment',
        context: 'supporting'
      });
    }

    return doc;
  }

  /**
   * Determine package type from documents
   * @param {Array<DocumentEntity>} documents - Document entities
   * @returns {Promise<string>}
   */
  async determinePackageType(documents) {
    const emailDocs = documents.filter(doc => 
      doc.classification.type === 'email_pdf'
    );
    const recordDocs = documents.filter(doc => 
      doc.classification.type === 'record_table'
    );
    const otherDocs = documents.filter(doc => 
      doc.classification.type === 'attachment'
    );

    if (emailDocs.length > 0) {
      if (recordDocs.length === 1) {
        return 'PDF_WITH_RECORDS';
      } else if (otherDocs.length > 0) {
        return 'PDF_WITH_OTHERS';
      } else {
        return 'PDF_ONLY';
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Build relationships between documents
   * @param {Array<DocumentEntity>} documents - Document entities
   * @param {string} packageType - Package type
   */
  async buildRelationships(documents, packageType) {
    const emailDocs = documents.filter(doc => 
      doc.classification.type === 'email_pdf'
    );
    const recordDoc = documents.find(doc => 
      doc.classification.type === 'record_table'
    );

    switch (packageType) {
      case 'PDF_WITH_RECORDS':
        // Link emails with record table
        emailDocs.forEach(email => {
          email.addCompanion(recordDoc.id);
          recordDoc.addContext(email.id);
        });
        break;

      case 'PDF_WITH_OTHERS':
        // Link attachments to their emails (TODO: implement matching logic)
        const otherDocs = documents.filter(doc => 
          doc.classification.type === 'attachment'
        );
        otherDocs.forEach(attachment => {
          // For now, link to first email
          attachment.addContext(emailDocs[0].id);
          emailDocs[0].addCompanion(attachment.id);
        });
        break;
    }
  }

  /**
   * Group documents by their role in the package
   * @param {Array<DocumentEntity>} documents - Document entities
   * @param {string} packageType - Package type
   * @returns {Object} Grouped documents
   */
  groupDocuments(documents, packageType) {
    return {
      emails: documents.filter(doc => 
        doc.classification.type === 'email_pdf'
      ),
      records: documents.find(doc => 
        doc.classification.type === 'record_table'
      ) || null,
      others: documents.filter(doc => 
        doc.classification.type === 'attachment'
      )
    };
  }

  /**
   * Check if a file is an email PDF
   * @param {string} filePath - Path to file
   * @returns {Promise<boolean>}
   */
  async isEmailPdf(filePath) {
    try {
      // Use mock processor in test environment
      const pdfProcessor = process.env.NODE_ENV === 'test' 
        ? (await import('../../test/mocks/pdf-processor.js')).default
        : (await import('./pdf-processor.js')).default;
      const content = await pdfProcessor.extractText(filePath);
      
      const emailMarkers = [
        /from:/i,
        /to:/i,
        /subject:/i,
        /date:/i
      ];

      const markerCount = emailMarkers.reduce((count, marker) => {
        return count + (marker.test(content) ? 1 : 0);
      }, 0);

      return markerCount >= 3;
    } catch (error) {
      logger.error(`Error checking PDF type: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a file is a record table
   * @param {string} filePath - Path to file
   * @returns {Promise<boolean>}
   */
  async isRecordTable(filePath) {
    try {
      // Use mock processor in test environment
      const odsProcessor = process.env.NODE_ENV === 'test'
        ? (await import('../../test/mocks/ods-processor.js')).default
        : (await import('./ods-processor.js')).default;
      const content = await odsProcessor.extractHeaders(filePath);
      
      const requiredHeaders = [
        'Thread ID',
        'Message ID',
        'From',
        'To',
        'Subject'
      ];

      const headerCount = requiredHeaders.reduce((count, header) => {
        return count + (content.includes(header) ? 1 : 0);
      }, 0);

      return headerCount >= 4;
    } catch (error) {
      logger.error(`Error checking spreadsheet type: ${error.message}`);
      return false;
    }
  }
}

export default new PackageAnalyzer();
