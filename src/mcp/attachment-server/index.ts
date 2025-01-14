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
import path from 'path';
import fs from 'fs/promises';

class AttachmentServer {
    private server: Server;
    private attachmentStore: any; // Will be imported dynamically
    private baseDir: string;

    constructor() {
        this.server = new Server(
            {
                name: 'attachment-server',
                version: '0.1.0',
            },
            {
                capabilities: {
                    resources: {},
                    tools: {},
                },
            }
        );

        this.baseDir = process.env.ATTACHMENT_DIR || 'processed/attachments';
        this.setupToolHandlers();
        this.setupResourceHandlers();

        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    private setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_attachment_info',
                    description: 'Get metadata for an attachment',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            hash: {
                                type: 'string',
                                description: 'Attachment hash',
                            },
                        },
                        required: ['hash'],
                    },
                },
                {
                    name: 'get_storage_stats',
                    description: 'Get attachment storage statistics',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                    },
                },
                {
                    name: 'find_duplicates',
                    description: 'Find duplicate attachments',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            minReferences: {
                                type: 'number',
                                description: 'Minimum number of references',
                                default: 2,
                            },
                        },
                    },
                },
            ],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            // Lazy load attachment store
            if (!this.attachmentStore) {
                this.attachmentStore = (
                    await import('../../simple-pdf-processor/src/services/attachment-store.js')
                ).default;
                await this.attachmentStore.init();
            }

            switch (request.params.name) {
                case 'get_attachment_info':
                    return this.handleGetAttachmentInfo(request.params.arguments);
                case 'get_storage_stats':
                    return this.handleGetStorageStats();
                case 'find_duplicates':
                    return this.handleFindDuplicates(request.params.arguments);
                default:
                    throw new McpError(
                        ErrorCode.MethodNotFound,
                        `Unknown tool: ${request.params.name}`
                    );
            }
        });
    }

    private setupResourceHandlers() {
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: [
                {
                    uri: 'attachment://stats/current',
                    name: 'Current Storage Statistics',
                    mimeType: 'application/json',
                    description: 'Current attachment storage statistics',
                },
            ],
        }));

        this.server.setRequestHandler(
            ListResourceTemplatesRequestSchema,
            async () => ({
                resourceTemplates: [
                    {
                        uriTemplate: 'attachment://{hash}/info',
                        name: 'Attachment Information',
                        mimeType: 'application/json',
                        description: 'Metadata for a specific attachment',
                    },
                    {
                        uriTemplate: 'attachment://{hash}/content',
                        name: 'Attachment Content',
                        description: 'Raw content of a specific attachment',
                    },
                ],
            })
        );

        this.server.setRequestHandler(
            ReadResourceRequestSchema,
            async (request) => {
                // Lazy load attachment store
                if (!this.attachmentStore) {
                    this.attachmentStore = (
                        await import('../../simple-pdf-processor/src/services/attachment-store.js')
                    ).default;
                    await this.attachmentStore.init();
                }

                const { uri } = request.params;

                // Handle static resources
                if (uri === 'attachment://stats/current') {
                    const stats = await this.attachmentStore.getStats();
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(stats, null, 2),
                            },
                        ],
                    };
                }

                // Handle dynamic resources
                const infoMatch = uri.match(/^attachment:\/\/([^/]+)\/info$/);
                if (infoMatch) {
                    const hash = infoMatch[1];
                    const info = await this.attachmentStore.getAttachmentInfo(hash);
                    if (!info) {
                        throw new McpError(
                            ErrorCode.NotFound,
                            `Attachment not found: ${hash}`
                        );
                    }
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(info, null, 2),
                            },
                        ],
                    };
                }

                const contentMatch = uri.match(
                    /^attachment:\/\/([^/]+)\/content$/
                );
                if (contentMatch) {
                    const hash = contentMatch[1];
                    const info = await this.attachmentStore.getAttachmentInfo(hash);
                    if (!info) {
                        throw new McpError(
                            ErrorCode.NotFound,
                            `Attachment not found: ${hash}`
                        );
                    }
                    const content = await fs.readFile(info.path, 'utf8');
                    return {
                        contents: [
                            {
                                uri,
                                text: content,
                            },
                        ],
                    };
                }

                throw new McpError(
                    ErrorCode.InvalidRequest,
                    `Invalid URI format: ${uri}`
                );
            }
        );
    }

    private async handleGetAttachmentInfo(args: any) {
        const info = await this.attachmentStore.getAttachmentInfo(args.hash);
        if (!info) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Attachment not found: ${args.hash}`,
                    },
                ],
                isError: true,
            };
        }

        const refs = await this.attachmentStore.getReferences(args.hash);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            ...info,
                            references: refs,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    private async handleGetStorageStats() {
        const stats = await this.attachmentStore.getStats();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(stats, null, 2),
                },
            ],
        };
    }

    private async handleFindDuplicates(args: any) {
        const minRefs = args?.minReferences || 2;
        const metadata = await this.attachmentStore.loadMetadata();
        
        const duplicates = Object.entries(metadata.references)
            .filter(([_, refs]: [string, string[]]) => refs.length >= minRefs)
            .map(([hash, refs]: [string, string[]]) => ({
                hash,
                info: metadata.attachments[hash],
                references: refs,
            }));

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(duplicates, null, 2),
                },
            ],
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Attachment MCP server running on stdio');
    }
}

const server = new AttachmentServer();
server.run().catch(console.error);
