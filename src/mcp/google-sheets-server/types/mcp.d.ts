declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(info: { name: string; version: string }, config: { capabilities: { resources: any; tools: any } });
    setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    onerror: (error: any) => void;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const CallToolRequestSchema: unique symbol;
  export const ListResourcesRequestSchema: unique symbol;
  export const ListResourceTemplatesRequestSchema: unique symbol;
  export const ListToolsRequestSchema: unique symbol;
  export const ReadResourceRequestSchema: unique symbol;

  export enum ErrorCode {
    InvalidRequest = 'InvalidRequest',
    InvalidParams = 'InvalidParams',
    MethodNotFound = 'MethodNotFound',
    InternalError = 'InternalError',
    ConfigurationError = 'ConfigurationError'
  }

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
  }
}
