import { google } from 'googleapis';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

class GoogleSheetsService {
    constructor() {
        this.sheets = null;
        this.spreadsheetId = null;
        this.initialized = false;
    }

    /**
     * Initialize Google Sheets API
     * @param {Object} credentials - Google API credentials
     * @param {string} spreadsheetId - ID of tracking spreadsheet
     */
    async initialize(credentials, spreadsheetId) {
        try {
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth });
            this.spreadsheetId = spreadsheetId;
            this.initialized = true;

            logger.info('Google Sheets service initialized');
        } catch (error) {
            logger.error('Failed to initialize Google Sheets:', error);
            throw error;
        }
    }

    /**
     * Create document tracking sheet with initial structure
     */
    async createTrackingSheet() {
        if (!this.initialized) throw new Error('Service not initialized');

        try {
            // Create sheets for different views
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        // Main tracking sheet
                        {
                            addSheet: {
                                properties: {
                                    title: 'Document Tracking',
                                    gridProperties: {
                                        frozenRowCount: 1,
                                        frozenColumnCount: 1
                                    }
                                }
                            }
                        },
                        // Processing status sheet
                        {
                            addSheet: {
                                properties: {
                                    title: 'Processing Status',
                                    gridProperties: {
                                        frozenRowCount: 1
                                    }
                                }
                            }
                        },
                        // Categories sheet
                        {
                            addSheet: {
                                properties: {
                                    title: 'Categories',
                                    gridProperties: {
                                        frozenRowCount: 1
                                    }
                                }
                            }
                        }
                    ]
                }
            });

            // Set up headers
            await this.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    valueInputOption: 'RAW',
                    data: [
                        {
                            range: 'Document Tracking!A1:J1',
                            values: [[
                                'Document ID',
                                'File Name',
                                'Type',
                                'Upload Date',
                                'Status',
                                'Pages',
                                'Word Count',
                                'Processing Time',
                                'Output Location',
                                'Notes'
                            ]]
                        },
                        {
                            range: 'Processing Status!A1:E1',
                            values: [[
                                'Document ID',
                                'Current Stage',
                                'Start Time',
                                'Estimated Completion',
                                'Status Message'
                            ]]
                        },
                        {
                            range: 'Categories!A1:C1',
                            values: [[
                                'Category Name',
                                'Document Count',
                                'Description'
                            ]]
                        }
                    ]
                }
            });

            logger.info('Created tracking sheet structure');
        } catch (error) {
            logger.error('Failed to create tracking sheet:', error);
            throw error;
        }
    }

    /**
     * Add new document entry
     * @param {Object} document - Document information
     */
    async addDocument(document) {
        if (!this.initialized) throw new Error('Service not initialized');

        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Document Tracking!A:J',
                valueInputOption: 'RAW',
                resource: {
                    values: [[
                        document.id,
                        document.fileName,
                        document.type,
                        new Date().toISOString(),
                        'Uploaded',
                        document.pages || '',
                        document.wordCount || '',
                        '',
                        '',
                        ''
                    ]]
                }
            });

            logger.info('Added document to tracking sheet:', document.id);
        } catch (error) {
            logger.error('Failed to add document:', error);
            throw error;
        }
    }

    /**
     * Update document status
     * @param {string} documentId - Document ID
     * @param {Object} status - Status update
     */
    async updateStatus(documentId, status) {
        if (!this.initialized) throw new Error('Service not initialized');

        try {
            // Find document row
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Document Tracking!A:A'
            });

            const rows = response.data.values || [];
            const rowIndex = rows.findIndex(row => row[0] === documentId);

            if (rowIndex === -1) {
                throw new Error(`Document not found: ${documentId}`);
            }

            // Update status
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `Document Tracking!E${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[status.status]]
                }
            });

            // Add processing status entry
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Processing Status!A:E',
                valueInputOption: 'RAW',
                resource: {
                    values: [[
                        documentId,
                        status.stage,
                        new Date().toISOString(),
                        status.estimatedCompletion || '',
                        status.message || ''
                    ]]
                }
            });

            logger.info('Updated document status:', documentId, status.status);
        } catch (error) {
            logger.error('Failed to update status:', error);
            throw error;
        }
    }

    /**
     * Update document metadata
     * @param {string} documentId - Document ID
     * @param {Object} metadata - Document metadata
     */
    async updateMetadata(documentId, metadata) {
        if (!this.initialized) throw new Error('Service not initialized');

        try {
            // Find document row
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Document Tracking!A:A'
            });

            const rows = response.data.values || [];
            const rowIndex = rows.findIndex(row => row[0] === documentId);

            if (rowIndex === -1) {
                throw new Error(`Document not found: ${documentId}`);
            }

            // Update metadata
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `Document Tracking!F${rowIndex + 1}:H${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[
                        metadata.pages || '',
                        metadata.wordCount || '',
                        metadata.processingTime || ''
                    ]]
                }
            });

            logger.info('Updated document metadata:', documentId);
        } catch (error) {
            logger.error('Failed to update metadata:', error);
            throw error;
        }
    }

    /**
     * Add or update category
     * @param {Object} category - Category information
     */
    async updateCategory(category) {
        if (!this.initialized) throw new Error('Service not initialized');

        try {
            // Check if category exists
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Categories!A:A'
            });

            const rows = response.data.values || [];
            const rowIndex = rows.findIndex(row => row[0] === category.name);

            if (rowIndex === -1) {
                // Add new category
                await this.sheets.spreadsheets.values.append({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Categories!A:C',
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[
                            category.name,
                            category.documentCount || 0,
                            category.description || ''
                        ]]
                    }
                });
            } else {
                // Update existing category
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `Categories!B${rowIndex + 1}:C${rowIndex + 1}`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[
                            category.documentCount || 0,
                            category.description || ''
                        ]]
                    }
                });
            }

            logger.info('Updated category:', category.name);
        } catch (error) {
            logger.error('Failed to update category:', error);
            throw error;
        }
    }
}

export default new GoogleSheetsService();
