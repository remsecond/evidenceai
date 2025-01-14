/// <reference types="node" />

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import fs from 'fs';

interface DocumentMetadata {
  fileName?: string;
  type?: string;
  pages?: number;
  wordCount?: number;
  processingTime?: string;
  outputLocation?: string;
  notes?: string;
  currentStage?: string;
  estimatedCompletion?: string;
  statusMessage?: string;
}

interface ProcessingQueueItem {
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  metadata: DocumentMetadata;
  addedDate: string;
}

type SheetRow = string[];

class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor() {
    const credentials = this.loadCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
    
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID environment variable is required');
    }
  }

  private loadCredentials(): Record<string, unknown> {
    try {
      return JSON.parse(fs.readFileSync('google-credentials.json', 'utf8'));
    } catch (error) {
      throw new Error('Failed to load Google credentials: ' + error);
    }
  }

  async getProcessingQueue(status?: string, limit = 10): Promise<ProcessingQueueItem[]> {
    try {
      // Get both Document Tracking and Processing Status data
      const [trackingResponse, statusResponse] = await Promise.all([
        this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Document Tracking!A2:J'
        }),
        this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Processing Status!A2:E'
        })
      ]);

      const trackingRows = trackingResponse.data.values || [];
      const statusRows = statusResponse.data.values || [];

      // Create a map of document metadata from tracking sheet
      const documentMetadata = new Map<string, DocumentMetadata>();
      trackingRows.forEach((row: SheetRow) => {
        documentMetadata.set(row[0], {
          fileName: row[1],
          type: row[2],
          pages: row[5] ? parseInt(row[5], 10) : undefined,
          wordCount: row[6] ? parseInt(row[6], 10) : undefined,
          processingTime: row[7],
          outputLocation: row[8],
          notes: row[9]
        });
      });

      // Build queue items from status sheet with metadata from tracking sheet
      let queue = statusRows.map((row: SheetRow) => {
        const documentId = row[0];
        const metadata = {
          ...documentMetadata.get(documentId),
          currentStage: row[1],
          estimatedCompletion: row[3],
          statusMessage: row[4]
        };

        return {
          documentId,
          status: row[2] as 'pending' | 'processing' | 'completed' | 'error',
          metadata,
          addedDate: new Date().toISOString()
        };
      });

      // Filter by status if provided
      if (status) {
        queue = queue.filter((item: ProcessingQueueItem) => item.status === status);
      }

      // Sort by most recent first and apply limit
      queue.sort((a, b) => b.addedDate.localeCompare(a.addedDate));
      return queue.slice(0, limit);
    } catch (error) {
      console.error('Failed to get processing queue:', error);
      throw error;
    }
  }

  async updateDocumentStatus(documentId: string, status: string, metadata?: DocumentMetadata): Promise<void> {
    try {
      // Update Document Tracking sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Document Tracking!A:J',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            documentId,
            metadata?.fileName || '',
            metadata?.type || '',
            new Date().toISOString(),
            status,
            metadata?.pages || '',
            metadata?.wordCount || '',
            metadata?.processingTime || '',
            metadata?.outputLocation || '',
            metadata?.notes || ''
          ]]
        }
      });

      // Update Processing Status sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Processing Status!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            documentId,
            metadata?.currentStage || 'Processing',
            new Date().toISOString(),
            metadata?.estimatedCompletion || '',
            metadata?.statusMessage || `Status updated to ${status}`
          ]]
        }
      });
    } catch (error) {
      console.error('Failed to update document status:', error);
      throw error;
    }
  }

  async createTrackingSheet(title: string): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title
          },
          sheets: [
            {
              properties: {
                title: 'Document Tracking',
                gridProperties: {
                  frozenRowCount: 1
                }
              }
            },
            {
              properties: {
                title: 'Processing Status',
                gridProperties: {
                  frozenRowCount: 1
                }
              }
            }
          ]
        }
      });

      const spreadsheetId = response.data.spreadsheetId!;

      // Set up headers
      await this.sheets.spreadsheets.values.batchUpdate({
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
                'Last Updated',
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
                'Status',
                'Estimated Completion',
                'Status Message'
              ]]
            }
          ]
        }
      });

      return spreadsheetId;
    } catch (error) {
      console.error('Failed to create tracking sheet:', error);
      throw error;
    }
  }
}

export { GoogleSheetsService, ProcessingQueueItem, DocumentMetadata };
