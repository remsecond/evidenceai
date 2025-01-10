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
import { spawn } from 'child_process';
import path from 'path';

class PDFProcessorServer {
  private server: Server;
  private extractors: Map<string, any>;

  constructor() {
    this.server = new Server(
      {
        name: 'pdf-processor-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize extractors
    this.extractors = new Map();
    this.setupExtractors();
    this.setupTools();
    this.setupResources();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupExtractors() {
    // Adobe Extractor
    this.extractors.set('adobe', {
      extract: async (file: string) => {
        return new Promise((resolve, reject) => {
          const process = spawn('python', ['scripts/adobe_extract.py', file]);
          let output = '';
          process.stdout.on('data', (data) => output += data);
          process.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`Adobe extraction failed with code ${code}`));
          });
        });
      }
    });

    // PyMuPDF Extractor
    this.extractors.set('fitz', {
      extract: async (file: string) => {
        return new Promise((resolve, reject) => {
          const process = spawn('python', ['scripts/fitz_extract.py', file]);
          let output = '';
          process.stdout.on('data', (data) => output += data);
          process.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`PyMuPDF extraction failed with code ${code}`));
          });
        });
      }
    });

    // PDFMiner Extractor
    this.extractors.set('pdfminer', {
      extract: async (file: string) => {
        return new Promise((resolve, reject) => {
          const process = spawn('python', ['scripts/pdfminer_extract.py', file]);
          let output = '';
          process.stdout.on('data', (data) => output += data);
          process.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`PDFMiner extraction failed with code ${code}`));
          });
        });
      }
    });

    // Tika Extractor
    this.extractors.set('tika', {
      extract: async (file: string) => {
        return new Promise((resolve, reject) => {
          const process = spawn('python', ['scripts/tika_extract.py', file]);
          let output = '';
          process.stdout.on('data', (data) => output += data);
          process.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`Tika extraction failed with code ${code}`));
          });
        });
      }
    });
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_document',
          description: 'Analyze PDF document characteristics',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Path to the PDF file'
              }
            },
            required: ['file_path']
          }
        },
        {
          name: 'extract_content',
          description: 'Extract content from PDF using multiple tools',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Path to the PDF file'
              },
              extractors: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['adobe', 'fitz', 'pdfminer', 'tika']
                },
                description: 'List of extractors to use'
              }
            },
            required: ['file_path']
          }
        },
        {
          name: 'extract_structure',
          description: 'Extract document structure and layout',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Path to the PDF file'
              }
            },
            required: ['file_path']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'analyze_document':
            return await this.analyzeDocument(request.params.arguments);
          case 'extract_content':
            return await this.extractContent(request.params.arguments);
          case 'extract_structure':
            return await this.extractStructure(request.params.arguments);
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
          uri: 'pdf://templates/extraction_config',
          name: 'Extraction Configuration Template',
          description: 'Template for configuring PDF extraction'
        }
      ]
    }));

    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [
        {
          uriTemplate: 'pdf://documents/{document_id}/analysis',
          name: 'Document Analysis',
          description: 'Analysis results for a specific document'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        if (request.params.uri === 'pdf://templates/extraction_config') {
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  extractors: ['adobe', 'fitz', 'pdfminer', 'tika'],
                  options: {
                    parallel: true,
                    timeout: 30000,
                    validateResults: true
                  }
                }, null, 2)
              }
            ]
          };
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

  private async analyzeDocument(args: any) {
    const filePath = args.file_path;
    if (!fs.existsSync(filePath)) {
      throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`);
    }

    try {
      // Basic file analysis
      const stats = fs.statSync(filePath);
      const analysis = {
        file_info: {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        },
        characteristics: {
          is_scanned: false, // To be implemented
          needs_ocr: false,  // To be implemented
          has_forms: false,  // To be implemented
          has_tables: false  // To be implemented
        },
        recommended_extractors: [] as string[]
      };

      // Determine recommended extractors
      if (analysis.characteristics.is_scanned) {
        analysis.recommended_extractors.push('adobe');
      } else {
        analysis.recommended_extractors.push('fitz');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Analysis failed: ${error.message}`
      );
    }
  }

  private async extractContent(args: any) {
    const filePath = args.file_path;
    if (!fs.existsSync(filePath)) {
      throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`);
    }

    const extractors = args.extractors || ['fitz'];
    const results = [];

    try {
      // Execute extractions in parallel
      const extractionPromises = extractors.map(async (extractor: string) => {
        const extractorImpl = this.extractors.get(extractor);
        if (!extractorImpl) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Unknown extractor: ${extractor}`
          );
        }
        return {
          extractor,
          result: await extractorImpl.extract(filePath)
        };
      });

      const extractionResults = await Promise.all(extractionPromises);
      
      // Combine results
      const combined = this.combineResults(extractionResults);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(combined, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Extraction failed: ${error.message}`
      );
    }
  }

  private async extractStructure(args: any) {
    const filePath = args.file_path;
    if (!fs.existsSync(filePath)) {
      throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`);
    }

    try {
      // Use PyMuPDF for structure extraction
      const fitz = this.extractors.get('fitz');
      const result = await fitz.extract(filePath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Structure extraction failed: ${error.message}`
      );
    }
  }

  private combineResults(results: any[]) {
    // Simple combination strategy - can be enhanced
    return {
      content: results.map(r => ({
        extractor: r.extractor,
        text: r.result
      })),
      metadata: {
        extractors_used: results.map(r => r.extractor),
        timestamp: new Date().toISOString()
      }
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PDF Processor MCP server running on stdio');
  }
}

const server = new PDFProcessorServer();
server.run().catch(console.error);
