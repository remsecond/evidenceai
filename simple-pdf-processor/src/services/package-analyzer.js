import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logging from '../utils/logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analyzes uploaded file packages to determine their type and structure
 */
class PackageAnalyzer {
  constructor() {
    this.logger = logging.getLogger('PackageAnalyzer');
  }

  /**
   * Analyzes a set of uploaded files to determine package type
   * @param {Array<{path: string, originalname: string}>} files - Uploaded files
   * @returns {Promise<{type: string, files: Object}>}
   */
  async analyzeUpload(files) {
    this.logger.info(`Analyzing upload package of ${files.length} files`);
    
    const analysis = {
      type: null,
      files: {
        emails: [],
        records: null,
        others: []
      }
    };

    // First pass: Categorize files
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (ext === '.pdf') {
        // Check if PDF is an email export
        const isEmail = await this.isEmailPdf(file.path);
        if (isEmail) {
          analysis.files.emails.push(file);
        } else {
          analysis.files.others.push(file);
        }
      } else if (ext === '.ods' || ext === '.xlsx') {
        // Check if spreadsheet is a record table
        const isRecordTable = await this.isRecordTable(file.path);
        if (isRecordTable) {
          analysis.files.records = file;
        } else {
          analysis.files.others.push(file);
        }
      } else {
        analysis.files.others.push(file);
      }
    }

    // Determine package type
    if (analysis.files.emails.length > 0) {
      if (analysis.files.records) {
        analysis.type = 'PDF_WITH_RECORDS';
      } else if (analysis.files.others.length > 0) {
        analysis.type = 'PDF_WITH_OTHERS';
      } else {
        analysis.type = 'PDF_ONLY';
      }
    }

    this.logger.info(`Package analysis complete: ${analysis.type}`);
    this.logger.info(`Found: ${analysis.files.emails.length} emails, ${analysis.files.records ? '1 record table' : 'no records'}, ${analysis.files.others.length} other files`);

    return analysis;
  }

  /**
   * Checks if a PDF file is an email export
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<boolean>}
   */
  async isEmailPdf(filePath) {
    try {
      // TODO: Implement more robust email PDF detection
      // For now, check basic markers like From:, To:, Subject:
      const pdfProcessor = (await import('./pdf-processor.js')).default;
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

      return markerCount >= 3; // If at least 3 email markers found
    } catch (error) {
      this.logger.error(`Error checking PDF type: ${error.message}`);
      return false;
    }
  }

  /**
   * Checks if a spreadsheet is a record table
   * @param {string} filePath - Path to spreadsheet file
   * @returns {Promise<boolean>}
   */
  async isRecordTable(filePath) {
    try {
      // TODO: Implement more robust record table detection
      // For now, check for expected column headers
      const odsProcessor = (await import('./ods-processor.js')).default;
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

      return headerCount >= 4; // If at least 4 required headers found
    } catch (error) {
      this.logger.error(`Error checking spreadsheet type: ${error.message}`);
      return false;
    }
  }
}

export default new PackageAnalyzer();
