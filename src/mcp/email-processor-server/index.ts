import { simpleParser, ParsedMail, Attachment, AddressObject } from 'mailparser';
import { PDFExtract, PDFExtractPage } from 'pdf.js-extract';
import { EventEmitter } from 'events';

interface EmailParserOptions {
  extractAttachments?: boolean;
  parseHeaders?: boolean;
  includeMetadata?: boolean;
}

interface ParsedEmail {
  headers: Record<string, string>;
  body: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
  metadata?: {
    sender: string;
    recipients: string[];
    date: string;
    subject: string;
  };
}

interface PDFContent {
  pages: PDFExtractPage[];
}

interface ContentType {
  value: string;
  params?: { [key: string]: string };
}

class EmailProcessor extends EventEmitter {
  private pdfExtractor: PDFExtract;

  constructor() {
    super();
    this.pdfExtractor = new PDFExtract();
  }

  private async extractTextFromPDF(pdfContent: Buffer): Promise<string> {
    try {
      const data: PDFContent = await this.pdfExtractor.extractBuffer(pdfContent);
      return data.pages.map(page => page.content.map(item => (item as any).str).join(' ')).join('\n');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
      }
      throw error;
    }
  }

  private extractEmailHeaders(text: string): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    const lines = text.split('\n');
    let currentHeader = '';
    
    for (const line of lines) {
      const match = line.match(/^(From|To|Subject|Date|Cc)\s*:\s*(.+)/i);
      if (match) {
        currentHeader = match[1].toLowerCase();
        headers[currentHeader] = match[2].trim();
      } else if (currentHeader && line.trim() && line.startsWith(' ')) {
        // Handle header value continuation
        headers[currentHeader] += ' ' + line.trim();
      }
    }
    
    return headers;
  }

  private formatAddressObject(addr: AddressObject | AddressObject[]): string {
    if (Array.isArray(addr)) {
      return addr.map(a => a.text).join(', ');
    }
    return addr.text || '';
  }

  private formatContentType(contentType: ContentType): string {
    if (!contentType) return 'text/plain';
    
    let result = contentType.value;
    if (contentType.params) {
      const params = Object.entries(contentType.params)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      if (params) {
        result += `; ${params}`;
      }
    }
    return result;
  }

  private async convertToMIME(content: string, format: string): Promise<string> {
    const headers = this.extractEmailHeaders(content);
    const mimeTemplate = `From: ${headers.from || '<extracted-from-content>'}
To: ${headers.to || '<extracted-from-content>'}
Subject: ${headers.subject || '<extracted-from-content>'}
Date: ${headers.date || new Date().toString()}
Content-Type: text/plain; charset=UTF-8

${content}`;

    return mimeTemplate;
  }

  async parseEmail(
    content: string,
    format: string,
    options: EmailParserOptions = {}
  ): Promise<ParsedEmail> {
    try {
      // Convert content to MIME format if needed
      const mimeContent = format === 'pdf' || format === 'text' 
        ? await this.convertToMIME(content, format)
        : content;

      const parsedEmail: ParsedMail = await simpleParser(mimeContent);

      // Create headers object from Map with proper formatting
      const headers: Record<string, string> = {};
      parsedEmail.headers.forEach((value, key) => {
        if (key === 'from' && parsedEmail.from) {
          headers[key] = this.formatAddressObject(parsedEmail.from);
        } else if (key === 'to' && parsedEmail.to) {
          headers[key] = this.formatAddressObject(parsedEmail.to);
        } else if (key === 'content-type') {
          headers[key] = this.formatContentType(value as ContentType);
        } else {
          headers[key] = value.toString();
        }
      });

      // Extract recipients
      const recipients: string[] = [];
      if (parsedEmail.to) {
        const toAddresses = Array.isArray(parsedEmail.to) ? parsedEmail.to : [parsedEmail.to];
        recipients.push(...toAddresses.map(addr => addr.text || ''));
      }

      const emailBody = parsedEmail.text || '';
      const result: ParsedEmail = {
        headers,
        body: emailBody,
        ...(options.includeMetadata && {
          metadata: {
            sender: parsedEmail.from?.text || '',
            recipients,
            date: parsedEmail.date?.toISOString() || '',
            subject: parsedEmail.subject || '',
          },
        }),
        ...(options.extractAttachments && {
          attachments: (parsedEmail.attachments || []).map((att: Attachment) => ({
            filename: att.filename || 'unnamed',
            content: att.content,
            contentType: att.contentType,
          })),
        }),
      };

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse email: ${error.message}`);
      }
      throw error;
    }
  }

  async processEmailFile(
    filePath: string,
    format: 'pdf' | 'text' | 'eml',
    options: EmailParserOptions = {}
  ): Promise<ParsedEmail> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath);
      
      let textContent: string;
      if (format === 'pdf') {
        textContent = await this.extractTextFromPDF(content);
      } else {
        textContent = content.toString('utf-8');
      }

      return this.parseEmail(textContent, format, options);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to process email file: ${error.message}`);
      }
      throw error;
    }
  }
}

export default EmailProcessor;
