import fs from 'fs';
import path from 'path';

class PDFProcessor {
    async process(filePath) {
        const stats = fs.statSync(filePath);
        const content = await fs.promises.readFile(filePath, 'utf8');
        
        // Basic text analysis
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const chunks = this.createChunks(content);
        
        return {
            raw_content: {
                text: content,
                chunks: chunks.map(chunk => ({
                    text: chunk,
                    metadata: {
                        length: chunk.length,
                        word_count: chunk.split(/\s+/).filter(w => w.length > 0).length
                    }
                }))
            },
            file_info: {
                path: filePath,
                size_bytes: stats.size,
                size_mb: (stats.size / (1024 * 1024)).toFixed(2),
                created: stats.birthtime,
                modified: stats.mtime
            },
            statistics: {
                pages: 1, // Simple text files treated as single page
                words: words.length,
                chunks: chunks.length,
                estimated_total_tokens: Math.ceil(content.length / 4), // Rough estimate
                average_tokens_per_chunk: Math.ceil((content.length / 4) / chunks.length)
            },
            processing_meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                processing_time: 0 // Will be set by timing wrapper
            }
        };
    }

    createChunks(text, maxChunkSize = 1000) {
        const chunks = [];
        const paragraphs = text.split(/\n\n+/);
        let currentChunk = '';

        for (const paragraph of paragraphs) {
            if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}

// Create singleton instance
const pdfProcessor = new PDFProcessor();

export default pdfProcessor;
