import { EventEmitter } from 'events';
import EmailProcessor from './index.js';

interface ProcessEmailArgs {
  filePath: string;
  format: 'pdf' | 'text' | 'eml';
  options?: {
    extractAttachments?: boolean;
    parseHeaders?: boolean;
    includeMetadata?: boolean;
  };
}

interface ProcessEmailResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class EmailProcessorServer extends EventEmitter {
  private processor: EmailProcessor;

  constructor() {
    super();
    this.processor = new EmailProcessor();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    process.on('message', async (message: any) => {
      if (message.type === 'processEmail') {
        const response = await this.handleProcessEmail(message.args);
        if (process.send) {
          process.send(response);
        }
      }
    });

    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  private async handleProcessEmail(args: ProcessEmailArgs): Promise<ProcessEmailResponse> {
    try {
      if (!args.filePath || !args.format) {
        return {
          success: false,
          error: 'filePath and format are required parameters',
        };
      }

      const result = await this.processor.processEmailFile(
        args.filePath,
        args.format,
        args.options
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private cleanup(): void {
    // Cleanup resources if needed
    this.removeAllListeners();
  }

  async start(): Promise<void> {
    // Server startup logic
    console.log('Email Processor server started');
  }
}

// Start the server
const server = new EmailProcessorServer();
server.start().catch(console.error);
