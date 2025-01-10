#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import fs from 'fs';

// Load environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required');
}

class GoogleSheetsMcpServer {
  private server: Server;
  private oauth2Client;
  private sheets;

  constructor() {
    this.server = new Server(
      {
        name: 'google-sheets-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Setup OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    // Load tokens if they exist
    try {
      const token = JSON.parse(fs.readFileSync('google-token.json', 'utf8'));
      this.oauth2Client.setCredentials(token);
    } catch (error) {
      console.error('No token file found, authentication will be required');
    }

    // Initialize Google Sheets API
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

    this.setupTools();
    this.setupResources();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_tracking_sheet',
          description: 'Create a new document tracking spreadsheet',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title for the tracking sheet'
              },
              template: {
                type: 'string',
                enum: ['library_catalog', 'processing_queue', 'metadata_tracker'],
                description: 'Template to use for the sheet'
              }
            },
            required: ['title', 'template']
          }
        },
        {
          name: 'update_document_status',
          description: 'Update document processing status',
          inputSchema: {
            type: 'object',
            properties: {
              document_id: {
                type: 'string',
                description: 'Unique identifier for the document'
              },
              status: {
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'error'],
                description: 'Current processing status'
              },
              metadata: {
                type: 'object',
                description: 'Additional document metadata'
              }
            },
            required: ['document_id', 'status']
          }
        },
        {
          name: 'get_processing_queue',
          description: 'Get current document processing queue',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'error'],
                description: 'Filter by status'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of documents to return'
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'create_tracking_sheet':
            return await this.createTrackingSheet(request.params.arguments);
          case 'update_document_status':
            return await this.updateDocumentStatus(request.params.arguments);
          case 'get_processing_queue':
            return await this.getProcessingQueue(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  private setupResources() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'sheets://templates/library_catalog',
          name: 'Library Catalog Template',
          description: 'Standard template for document library catalog'
        },
        {
          uri: 'sheets://templates/processing_queue',
          name: 'Processing Queue Template',
          description: 'Template for document processing queue'
        }
      ]
    }));

    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [
        {
          uriTemplate: 'sheets://documents/{document_id}/status',
          name: 'Document Status',
          description: 'Current status and metadata for a specific document'
        },
        {
          uriTemplate: 'sheets://queue/{status}',
          name: 'Processing Queue',
          description: 'Document processing queue filtered by status'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        // Handle resource reading based on URI pattern
        if (request.params.uri.startsWith('sheets://templates/')) {
          return await this.getTemplate(request.params.uri);
        } else if (request.params.uri.startsWith('sheets://documents/')) {
          return await this.getDocumentStatus(request.params.uri);
        } else if (request.params.uri.startsWith('sheets://queue/')) {
          return await this.getQueue(request.params.uri);
        }
        
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Invalid resource URI: ${request.params.uri}`
        );
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${error.message}`
        );
      }
    });
  }

  private async createTrackingSheet(args: any) {
    // Validate arguments
    if (!args.title || !args.template) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required parameters: title and template'
      );
    }

    try {
      // Create new spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: args.title
          },
          sheets: [
            {
              properties: {
                title: 'Documents'
              }
            }
          ]
        }
      });

      // Apply template
      await this.applyTemplate(spreadsheet.data.spreadsheetId!, args.template);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              spreadsheetId: spreadsheet.data.spreadsheetId,
              title: args.title,
              url: spreadsheet.data.spreadsheetUrl
            })
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create tracking sheet: ${error.message}`
      );
    }
  }

  private async updateDocumentStatus(args: any) {
    // Implementation
    return {
      content: [
        {
          type: 'text',
          text: 'Status updated successfully'
        }
      ]
    };
  }

  private async getProcessingQueue(args: any) {
    // Implementation
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            queue: []
          })
        }
      ]
    };
  }

  private async getTemplate(uri: string) {
    // Implementation
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            template: 'Example template'
          })
        }
      ]
    };
  }

  private async getDocumentStatus(uri: string) {
    // Implementation
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            status: 'pending'
          })
        }
      ]
    };
  }

  private async getQueue(uri: string) {
    // Implementation
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            queue: []
          })
        }
      ]
    };
  }

  private async applyTemplate(spreadsheetId: string, template: string) {
    // Implementation of template application
    const templates = {
      library_catalog: [
        ['Document ID', 'Title', 'Category', 'Status', 'Last Updated', 'Tags', 'Metadata'],
      ],
      processing_queue: [
        ['Document ID', 'Priority', 'Status', 'Added Date', 'Start Time', 'End Time', 'Duration'],
      ],
      metadata_tracker: [
        ['Document ID', 'Field', 'Value', 'Last Updated', 'Updated By'],
      ]
    };

    const templateData = templates[template as keyof typeof templates];
    if (!templateData) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid template: ${template}`
      );
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: templateData
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Sheets MCP server running on stdio');
  }
}

const server = new GoogleSheetsMcpServer();
server.run().catch(console.error);
