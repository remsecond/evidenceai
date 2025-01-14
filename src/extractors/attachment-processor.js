import fs from 'fs/promises';
import path from 'path';
import PdfParser from 'pdf2json';
import mammoth from 'mammoth';
import sharp from 'sharp';
import xlsx from 'xlsx';

export class AttachmentProcessor {
  constructor() {
    this.supportedTypes = new Map([
      ['.pdf', this.processPDF.bind(this)],
      ['.doc', this.processDoc.bind(this)],
      ['.docx', this.processDoc.bind(this)],
      ['.txt', this.processTxt.bind(this)],
      ['.jpg', this.processImage.bind(this)],
      ['.jpeg', this.processImage.bind(this)],
      ['.png', this.processImage.bind(this)],
      ['.gif', this.processImage.bind(this)],
      ['.csv', this.processCSV.bind(this)],
      ['.json', this.processDataFile.bind(this)]
    ]);

    this.pdfParser = new PdfParser();
    this.setupPDFParser();
  }

  setupPDFParser() {
    this.pdfParser.on('pdfParser_dataError', errData => 
      console.error('PDF parsing error:', errData.parserError)
    );
  }

  async processDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      const results = [];

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile()) {
          try {
            const result = await this.processFile(filePath);
            if (result) {
              results.push(result);
            }
          } catch (error) {
            console.error(`Error processing file ${file}:`, error);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing directory:', error);
      throw error;
    }
  }

  async processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const processor = this.supportedTypes.get(ext);

    if (!processor) {
      console.warn(`Unsupported file type: ${ext}`);
      return null;
    }

    try {
      const result = await processor(filePath);
      return {
        id: this.generateAttachmentId(),
        path: filePath,
        name: path.basename(filePath),
        type: this.determineType(ext),
        content: result.content,
        metadata: {
          ...result.metadata,
          size: (await fs.stat(filePath)).size,
          modified: (await fs.stat(filePath)).mtime.toISOString()
        }
      };
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      return null;
    }
  }

  async processPDF(filePath) {
    return new Promise((resolve, reject) => {
      this.pdfParser.on('pdfParser_dataReady', pdfData => {
        const content = this.extractPDFContent(pdfData);
        resolve({
          content: content.text,
          metadata: {
            pages: pdfData.Pages.length,
            version: pdfData.Meta?.PDFFormatVersion,
            encrypted: pdfData.Meta?.IsEncrypted || false,
            ...content.metadata
          }
        });
      });

      this.pdfParser.loadPDF(filePath);
    });
  }

  extractPDFContent(pdfData) {
    const content = {
      text: '',
      metadata: {
        headers: [],
        footers: [],
        images: 0
      }
    };

    pdfData.Pages.forEach(page => {
      // Extract text
      const pageText = page.Texts
        .map(text => decodeURIComponent(text.R[0].T))
        .join(' ');
      content.text += pageText + '\n';

      // Track headers/footers
      const firstLine = page.Texts[0]?.R[0].T;
      const lastLine = page.Texts[page.Texts.length - 1]?.R[0].T;
      if (firstLine) content.metadata.headers.push(decodeURIComponent(firstLine));
      if (lastLine) content.metadata.footers.push(decodeURIComponent(lastLine));

      // Count images
      content.metadata.images += page.Images?.length || 0;
    });

    return content;
  }

  async processDoc(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    return {
      content: result.value,
      metadata: {
        ...result.messages,
        paragraphs: result.value.split('\n\n').length,
        headers: [],
        footers: []
      }
    };
  }

  async processTxt(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return {
      content,
      metadata: {
        lines: content.split('\n').length,
        words: content.split(/\s+/).length,
        characters: content.length
      }
    };
  }

  async processImage(filePath) {
    const metadata = await sharp(filePath).metadata();
    return {
      content: null, // Images don't have text content
      metadata: {
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation
      }
    };
  }

  async processCSV(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Parse CSV using xlsx
    const workbook = xlsx.read(content, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    return {
      content: lines.join('\n'),
      metadata: {
        rows: data.length,
        columns: Object.keys(data[0] || {}).length,
        headers: Object.keys(data[0] || {}),
        format: 'csv'
      }
    };
  }

  async processDataFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Check if content looks like CSV
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.includes(',') && !firstLine.includes('{') && !firstLine.includes('[')) {
      console.log('Detected CSV content, processing as CSV');
      return this.processCSV(filePath);
    }

    try {
      const data = JSON.parse(content);
      return {
        content,
        metadata: {
          type: Array.isArray(data) ? 'array' : 'object',
          length: Array.isArray(data) ? data.length : Object.keys(data).length,
          keys: Object.keys(data),
          format: 'json'
        }
      };
    } catch (error) {
      console.warn(`Failed to parse as JSON, attempting CSV parsing: ${error.message}`);
      return this.processCSV(filePath);
    }
  }

  determineType(extension) {
    const typeMap = {
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document',
      '.txt': 'document',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.csv': 'data',
      '.json': 'data'
    };

    return typeMap[extension.toLowerCase()] || 'unknown';
  }

  generateAttachmentId() {
    return `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async validateAttachment(attachment) {
    const issues = [];

    // Check file existence
    try {
      await fs.access(attachment.path);
    } catch {
      issues.push({
        type: 'missing_file',
        message: 'Attachment file not found'
      });
      return { valid: false, issues };
    }

    // Check file size
    const stats = await fs.stat(attachment.path);
    if (stats.size === 0) {
      issues.push({
        type: 'empty_file',
        message: 'Attachment is empty'
      });
    }

    // Check content based on type
    if (attachment.type === 'document' && !attachment.content) {
      issues.push({
        type: 'missing_content',
        message: 'Document content could not be extracted'
      });
    }

    // Check metadata
    if (!attachment.metadata) {
      issues.push({
        type: 'missing_metadata',
        message: 'Attachment metadata is missing'
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  async extractMetadata(attachments) {
    const metadata = {
      types: new Map(),
      sizes: {
        total: 0,
        average: 0,
        max: 0
      },
      timeframe: {
        start: null,
        end: null
      }
    };

    attachments.forEach(attachment => {
      // Track types
      const count = metadata.types.get(attachment.type) || 0;
      metadata.types.set(attachment.type, count + 1);

      // Track sizes
      const size = attachment.metadata.size;
      metadata.sizes.total += size;
      metadata.sizes.max = Math.max(metadata.sizes.max, size);

      // Track timeframe
      const timestamp = new Date(attachment.metadata.modified);
      if (!metadata.timeframe.start || timestamp < metadata.timeframe.start) {
        metadata.timeframe.start = timestamp;
      }
      if (!metadata.timeframe.end || timestamp > metadata.timeframe.end) {
        metadata.timeframe.end = timestamp;
      }
    });

    // Calculate average size
    metadata.sizes.average = metadata.sizes.total / attachments.length;

    return {
      types: Object.fromEntries(metadata.types),
      sizes: metadata.sizes,
      timeframe: {
        start: metadata.timeframe.start?.toISOString(),
        end: metadata.timeframe.end?.toISOString()
      }
    };
  }
}
