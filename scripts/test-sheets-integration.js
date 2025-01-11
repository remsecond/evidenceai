import { google } from 'googleapis';
import fs from 'fs';
import { getLogger } from '../src/utils/logging.js';

const logger = getLogger();

// Load credentials from token file
const tokenData = JSON.parse(fs.readFileSync('google-token.json'));

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2();
oauth2Client.setCredentials(tokenData);

// Initialize sheets API
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

async function testGoogleSheetsIntegration() {
    try {
        logger.info('Starting Google Sheets integration test');

        // Create new spreadsheet
        logger.info('Creating new spreadsheet');
        const createResponse = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: 'EvidenceAI Document Tracking'
                }
            }
        });

        const spreadsheetId = createResponse.data.spreadsheetId;
        logger.info('Created spreadsheet:', spreadsheetId);

        // Create sheets for different views
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
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
                    }
                ]
            }
        });

        // Set up headers
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
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
                    }
                ]
            }
        });

        // Add test document
        const testDoc = {
            id: 'TEST-001',
            fileName: 'OFW_Messages_Report_Dec.pdf',
            type: 'PDF',
            uploadDate: new Date().toISOString(),
            status: 'Processing',
            pages: 150,
            wordCount: 124019,
            processingTime: '1.079s',
            outputLocation: 'ai-outputs/deepseek/ofw-processing-2025-01-11T00-16-27-040Z',
            notes: 'Test document'
        };

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Document Tracking!A:J',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[
                    testDoc.id,
                    testDoc.fileName,
                    testDoc.type,
                    testDoc.uploadDate,
                    testDoc.status,
                    testDoc.pages,
                    testDoc.wordCount,
                    testDoc.processingTime,
                    testDoc.outputLocation,
                    testDoc.notes
                ]]
            }
        });

        // Add processing status
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Processing Status!A:E',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[
                    testDoc.id,
                    'PDF Processing',
                    new Date().toISOString(),
                    new Date(Date.now() + 60000).toISOString(),
                    'Processing PDF content'
                ]]
            }
        });

        logger.info('Test completed successfully');
        logger.info('Spreadsheet URL:', `https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
        
        // Save spreadsheet ID for future use
        fs.writeFileSync('.env', `
# Google OAuth Configuration
GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET}

# Google Sheets Configuration
GOOGLE_SHEET_ID=${spreadsheetId}
`);
        
        logger.info('Updated .env with spreadsheet ID');
    } catch (error) {
        logger.error('Test failed:', error);
        throw error;
    }
}

// Run test
testGoogleSheetsIntegration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
