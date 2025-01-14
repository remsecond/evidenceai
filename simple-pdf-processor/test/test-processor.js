import { BaseProcessor } from '../src/services/base-processor.js';
import { getLogger } from '../src/utils/logging.js';

const logger = getLogger();

class TestProcessor extends BaseProcessor {
    constructor() {
        super();
        // Smart chunking settings
        this.targetTokens = 150;
        this.overlapTokens = 250;
        this.charsPerToken = 3.2;
    }

    async processText(text, metadata = {}) {
        try {
            logger.info('Starting text processing');
            const startTime = Date.now();

            // Detect format
            const isOFWFormat = /Message \d+ of \d+/.test(text);
            const format = isOFWFormat ? 'ofw' : 'email';

            // Pre-process text based on format
            const processedText = isOFWFormat ? 
                this.preprocessOFW(text) :
                this.preprocessEmail(text);

            // Smart chunk based on format
            const chunks = isOFWFormat ? 
                this.smartChunkOFW(processedText) :
                this.smartChunkEmails(processedText);

            // Calculate statistics
            const words = text.match(/\S+/g)?.length || 0;
            const totalTokens = this.estimateTokens(text);
            const avgTokens = chunks.reduce((sum, chunk) => 
                sum + chunk.metadata.estimated_tokens, 0) / chunks.length;

            const result = {
                statistics: {
                    pages: metadata.pages || 1,
                    words: words,
                    chunks: chunks.length,
                    estimated_total_tokens: totalTokens,
                    average_tokens_per_chunk: avgTokens,
                    format: format
                },
                raw_content: {
                    text: text,
                    chunks: chunks,
                    structure: {}
                },
                processing_meta: {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    processing_time: Date.now() - startTime
                }
            };

            logger.info('Text processing complete', {
                chunks: result.statistics.chunks,
                processing_time: result.processing_meta.processing_time
            });

            return result;

        } catch (error) {
            logger.error('Error processing text:', error);
            throw error;
        }
    }

    preprocessOFW(text) {
        return text.replace(/(?=Message \d+ of \d+)/g, '\n\n');
    }

    preprocessEmail(text) {
        return text
            .replace(/(?:Subject|From|To|Date):\s*/gi, match => `\n${match}`)
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\x00/g, '');
    }

    smartChunkEmails(text) {
        const chunks = [];
        let position = 0;
        let emailId = 1;
        let threadId = 1;

        const emails = text.split(/(?=\nSubject:)/).filter(m => m.trim());

        for (const email of emails) {
            const headers = {
                subject: (email.match(/\nSubject:\s*([^\n]+)/) || [])[1],
                from: (email.match(/\nFrom:\s*([^\n]+)/) || [])[1],
                to: (email.match(/\nTo:\s*([^\n]+)/) || [])[1],
                date: (email.match(/\nDate:\s*([^\n]+)/) || [])[1]
            };

            if (headers.subject?.toLowerCase().startsWith('re:')) {
                threadId = chunks[chunks.length - 1]?.metadata.thread_id || threadId;
            } else {
                threadId++;
            }

            chunks.push({
                text: email,
                metadata: {
                    type: 'email',
                    section: `Email ${emailId}`,
                    position: position++,
                    estimated_tokens: this.estimateTokens(email),
                    continues: false,
                    overlap_tokens: 0,
                    thread_id: threadId,
                    email_id: emailId,
                    references: [],
                    headers: headers
                }
            });

            emailId++;
        }

        return chunks;
    }

    smartChunkOFW(text) {
        const chunks = [];
        let position = 0;
        let messageId = 1;

        const messages = text.split(/(?=Message \d+ of \d+)/).filter(m => m.trim());

        for (const message of messages) {
            chunks.push({
                text: message,
                metadata: {
                    type: 'message',
                    section: `Message ${messageId}`,
                    position: position++,
                    estimated_tokens: this.estimateTokens(message),
                    continues: false,
                    overlap_tokens: 0
                }
            });

            messageId++;
        }

        return chunks;
    }

    estimateTokens(text) {
        return Math.ceil(text.length / this.charsPerToken);
    }
}

export default new TestProcessor();
