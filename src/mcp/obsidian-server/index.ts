#!/usr/bin/env node
// Obsidian MCP server — bridges agents to an Obsidian vault via the
// Local REST API plugin. Stdio transport, matching sibling MCP servers
// in src/mcp/.
//
// Required env:
//   OBSIDIAN_REST_URL    e.g. https://127.0.0.1:27124
//   OBSIDIAN_REST_TOKEN  bearer token issued by the plugin
//
// Optional env:
//   OBSIDIAN_VAULT_NAME         informational label
//   OBSIDIAN_DEFAULT_FOLDER     default folder for list_notes (default: "")
//   OBSIDIAN_INSECURE_TLS       "true" to accept self-signed cert (localhost dev)
//   OBSIDIAN_REQUEST_TIMEOUT_MS per-request timeout (default 15000)

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ObsidianClient } from './client.js';
import { dispatchTool, toolDefinitions } from './tools.js';

const REST_URL = process.env.OBSIDIAN_REST_URL;
const REST_TOKEN = process.env.OBSIDIAN_REST_TOKEN;

if (!REST_URL || !REST_TOKEN) {
  throw new Error(
    'OBSIDIAN_REST_URL and OBSIDIAN_REST_TOKEN environment variables are required'
  );
}

const DEFAULT_FOLDER = process.env.OBSIDIAN_DEFAULT_FOLDER ?? '';
const INSECURE_TLS = process.env.OBSIDIAN_INSECURE_TLS === 'true';
const REQUEST_TIMEOUT_MS = process.env.OBSIDIAN_REQUEST_TIMEOUT_MS
  ? Number(process.env.OBSIDIAN_REQUEST_TIMEOUT_MS)
  : undefined;

class ObsidianMcpServer {
  private server: Server;
  private client: ObsidianClient;

  constructor() {
    this.server = new Server(
      { name: 'obsidian-mcp', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );

    this.client = new ObsidianClient({
      baseUrl: REST_URL!,
      token: REST_TOKEN!,
      insecureTls: INSECURE_TLS,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    });

    this.setupTools();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolDefinitions.map((t) => ({ ...t })),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return dispatchTool(
        request.params.name,
        request.params.arguments,
        this.client,
        DEFAULT_FOLDER
      );
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Obsidian MCP server running on stdio');
  }
}

const server = new ObsidianMcpServer();
server.run().catch((err) => {
  console.error('[MCP Fatal]', err);
  process.exit(1);
});
