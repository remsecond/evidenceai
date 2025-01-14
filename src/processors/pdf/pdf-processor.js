import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { createRequire } from 'module';
import { BaseProcessor } from '../base-processor.js';
import { getLogger } from '../../utils/logging.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const logger = getLogger('PDFProcessor');

/**
 * PDF processor with streaming architecture and proper resource management
 */
class PDFProcessor extends BaseProcessor {
    constructor(options = {}) {
        super({
            chunkSize: 1024 * 64,
            maxBufferSize: 1024 * 1024 * 10,
            ...options
        });

        this.pdfDoc = null;
        this.currentPage = 0;
        this.totalPages = 0;
    }

    /**
     * Set up PDF-specific processing stages
     */
    setupStages() {
        // PDF extraction stage
        this.stages.set('extract', new Transform({
            objectMode: true,
            transform: async (chunk, encoding, callback) => {
                try {
                    // Skip the initial 'start' trigger
                    if (chunk === 'start') {
                        logger.info('Starting extraction');
                        const pageNum = this.currentPage++;
                        const page = await this.pdfDoc.getPage(pageNum + 1);
                        const content = await page.getTextContent();
                        const text = content.items.map(item => item.str).join(' ');
                        logger.info(`Extracted ${text.length} characters from page ${pageNum + 1}`);
                        await page.cleanup();
                        callback(null, text);
                        return;
                    }

                    // Process subsequent pages
                    const pageNum = this.currentPage++;
                    if (pageNum >= this.totalPages) {
                        logger.info('Extraction complete, processed pages:', pageNum);
                        callback(null, null);
                        return;
                    }

                    logger.info(`Extracting page ${pageNum + 1}/${this.totalPages}`);
                    const page = await this.pdfDoc.getPage(pageNum + 1);
                    const content = await page.getTextContent();
                    const text = content.items.map(item => item.str).join(' ');
                    logger.info(`Extracted ${text.length} characters from page ${pageNum + 1}`);
                    await page.cleanup();
                    callback(null, text);
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // Format detection stage
        this.stages.set('format', new Transform({
            objectMode: true,
            transform: (chunk, encoding, callback) => {
                try {
                    if (!chunk) {
                        callback(null, null);
                        return;
                    }

                    const text = chunk.toString();
                    const format = this.detectFormat(text);
                    logger.info('Format detection:', { text: text.substring(0, 100), format });
                    callback(null, { text, format });
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // Content preprocessing stage
        this.stages.set('preprocess', new Transform({
            objectMode: true,
            transform: (chunk, encoding, callback) => {
                try {
                    if (!chunk) {
                        callback(null, null);
                        return;
                    }

                    const { text, format } = chunk;
                    const processed = format === 'ofw' ? 
                        this.preprocessOFW(text) : 
                        this.preprocessEmail(text);
                    
                    callback(null, processed);
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // Add base stages
        super.setupStages();
    }

    /**
     * Process PDF file through streaming pipeline
     */
    async process(filePath) {
        try {
            logger.info('Starting PDF processing:', filePath);
            const startTime = Date.now();

            // Get file stats
            const stats = fs.statSync(filePath);
            const fileInfo = {
                path: filePath,
                size_bytes: stats.size,
                size_mb: (stats.size / (1024 * 1024)).toFixed(2),
                created: stats.birthtime,
                modified: stats.mtime
            };

            // Check file extension
            const ext = path.extname(filePath).toLowerCase();
            let text;
            let metadata;
            let pages = 1;

            if (ext === '.pdf') {
                try {
                    // Read and parse PDF
                    const dataBuffer = fs.readFileSync(filePath);
                    const pdfData = await pdfParse(dataBuffer);
                    text = pdfData.text;
                    pages = pdfData.numpages;
                    metadata = {
                        format: this.detectFormat(text),
                        participants: [],
                        topics: []
                    };
                    // Process text
                    text = metadata.format === 'ofw' ? 
                        this.preprocessOFW(text) : 
                        this.preprocessEmail(text);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        throw new Error(`Could not find file: ${filePath}`);
                    }
                    throw error;
                }
            } else {
                // Read text file directly
                text = fs.readFileSync(filePath, 'utf8');
                metadata = {
                    format: this.detectFormat(text),
                    participants: [],
                    topics: []
                };
                // Process text and create chunks
                text = metadata.format === 'ofw' ? 
                    this.preprocessOFW(text) : 
                    this.preprocessEmail(text);
                
                // Create chunks based on format
                const chunks = this.createChunks(text, metadata.format);
                
                // For text files, estimate pages based on content
                pages = Math.max(1, Math.ceil(text.length / 3000)); // ~3000 chars per page
                
                // Update metadata with chunks
                metadata.chunks = chunks;
            }
            logger.info('Pipeline complete, received:', { 
                textLength: text?.length || 0,
                format: metadata?.format
            });

            // Build result
            const result = {
                file_info: fileInfo,
                statistics: {
                    pages: pages,
                    words: text.match(/\S+/g)?.length || 0,
                    chunks: metadata.chunks?.length || 0,
                    estimated_total_tokens: Math.ceil(text.length / 3.2),
                    average_tokens_per_chunk: metadata.chunks?.length ? 
                        Math.ceil(text.length / (3.2 * metadata.chunks.length)) : 0
                },
                raw_content: {
                    text: text.trim(),
                    chunks: metadata.chunks || [],
                    structure: {
                        format: metadata.format,
                        metadata
                    }
                },
                processing_meta: {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    processing_time: Date.now() - startTime
                }
            };

            // Validate and return
            this.validateResult(result);
            return result;

        } catch (error) {
            logger.error('Error processing PDF:', error);
            throw error;
        } finally {
            // Clean up
            if (this.pdfDoc) {
                await this.pdfDoc.destroy();
                this.pdfDoc = null;
            }
            this.destroy();
        }
    }

    /**
     * Detect document format
     */
    detectFormat(text) {
        return /Message \d+ of \d+/.test(text) ? 'ofw' : 'email';
    }

    /**
     * Preprocess OFW format
     */
    preprocessOFW(text) {
        return text.replace(/(?=Message \d+ of \d+)/g, '\n\n');
    }

    /**
     * Preprocess email format using basic header extraction
     */
    createChunks(text, format) {
        const maxTokens = 25000;
        const targetTokens = 150;
        const chunks = [];
        
        if (format === 'ofw') {
            // Split by OFW message markers
            const messages = text.split(/(?=Message \d+ of \d+)/);
            messages.forEach((message, index) => {
                if (!message.trim()) return;
                
                const estimatedTokens = Math.ceil(message.length / 3.2);
                chunks.push({
                    text: message,
                    metadata: {
                        type: 'message',
                        section: `Message ${index + 1}`,
                        position: index,
                        estimated_tokens: estimatedTokens,
                        continues: false,
                        overlap_tokens: 0
                    }
                });
            });
        } else {
            // Split by email headers but combine small chunks
            const emails = text.split(/(?=Subject:|From:|To:|Date:)/);
            let threadId = 1;
            let emailId = 1;
            let currentChunk = '';
            let currentHeaders = {};
            let chunkStartIndex = 0;
            
            emails.forEach((email, index) => {
                if (!email.trim()) return;
                
                const headerMatches = email.matchAll(/^(Subject|From|To|Date):\s*([^\n]+)/gmi);
                const headers = {};
                for (const match of headerMatches) {
                    headers[match[1].toLowerCase()] = match[2].trim();
                }
                
                // Add to current chunk
                currentChunk += email;
                Object.assign(currentHeaders, headers);
                
                // Check if chunk is large enough or last email
                const estimatedTokens = Math.ceil(currentChunk.length / 3.2);
                if (estimatedTokens >= targetTokens || index === emails.length - 1) {
                    chunks.push({
                        text: currentChunk,
                        metadata: {
                            type: 'email',
                            section: `Email ${emailId}`,
                            position: chunkStartIndex,
                            estimated_tokens: estimatedTokens,
                            continues: false,
                            overlap_tokens: 0,
                            thread_id: threadId,
                            email_id: emailId++,
                            references: [],
                            headers: currentHeaders
                        }
                    });
                    currentChunk = '';
                    currentHeaders = {};
                    chunkStartIndex = index + 1;
                }
            });
        }
        
        return chunks;
    }

    preprocessEmail(text) {
        const headerPattern = /^(Subject|From|To|Cc|Date|Reply-To|Message-ID|References|In-Reply-To):\s*([^\n]+)/gmi;
        const headers = {};
        let headerText = '';
        let match;

        while ((match = headerPattern.exec(text)) !== null) {
            const [_, name, value] = match;
            headers[name.toLowerCase()] = value.trim();
            headerText += `${name}: ${value.trim()}\n`;
        }

        const bodyStart = text.indexOf('\n\n');
        let body = bodyStart > -1 ? text.slice(bodyStart).trim() : text;

        body = body
            .replace(/^>.*$/gm, '')
            .replace(/^-{2,}.*$/gm, '')
            .replace(/^Sent from.*$/gm, '')
            .replace(/\n{3,}/g, '\n\n');

        return `${headerText}\n${body}`;
    }
}

export default new PDFProcessor();
