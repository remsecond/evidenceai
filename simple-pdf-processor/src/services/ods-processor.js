import XLSX from 'xlsx';
import { BaseProcessor } from './base-processor.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

/**
 * OpenDocument Spreadsheet processor for handling .ods files
 */
class ODSProcessor extends BaseProcessor {
    constructor(options = {}) {
        super({
            chunkSize: 1024 * 64,
            maxBufferSize: 1024 * 1024 * 10,
            ...options
        });
    }

    /**
     * Extract headers from ODS file
     */
    async extractHeaders(filePath) {
        const result = await this.process(filePath);
        return JSON.stringify(result.raw_content.headers);
    }

    /**
     * Process ODS file and extract labels
     */
    async process(filePath) {
        try {
            logger.info('Starting ODS processing:', filePath);
            const startTime = Date.now();

            // Read workbook
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Extract headers and labels
            const headers = data[0] || [];
            const rows = data.slice(1);

            // Process labels
            const labels = rows.map(row => {
                const label = {};
                // Initialize all fields with empty strings
                headers.forEach(header => {
                    label[header] = '';
                });
                // Fill in actual values
                headers.forEach((header, index) => {
                    if (header && row[index] !== undefined) {
                        label[header] = row[index].toString();
                    }
                });
                return label;
            }).filter(label => Object.keys(label).length > 0);

            // Build result
            const result = {
                file_info: {
                    path: filePath,
                    sheet_name: sheetName,
                    total_rows: rows.length,
                    total_columns: headers.length
                },
                statistics: {
                    labels: labels.length,
                    fields: headers.length,
                    total_cells: rows.length * headers.length
                },
                raw_content: {
                    headers,
                    labels,
                    structure: {
                        format: 'ods',
                        metadata: {
                            sheet_names: workbook.SheetNames,
                            active_sheet: sheetName
                        }
                    }
                },
                processing_meta: {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    processing_time: Date.now() - startTime
                }
            };

            // Validate and return
            this.validateResult(result);
            return result;

        } catch (error) {
            logger.error('Error processing ODS:', error);
            throw error;
        }
    }

    /**
     * Validate the structure of the result
     */
    validateResult(result) {
        const required = ['file_info', 'statistics', 'raw_content', 'processing_meta'];
        required.forEach(field => {
            if (!result[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        });
    }
}

export default new ODSProcessor();
