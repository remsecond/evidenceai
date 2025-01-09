import fs from 'fs';
import path from 'path';
import pdfProcessor from '../pdf-processor.js';

/**
 * Deepseek-specific PDF processor that extends the base processor
 * with optimizations for Deepseek's context handling and formatting preferences
 */
class DeepseekProcessor {
    constructor() {
        this.baseProcessor = pdfProcessor;
        this.modelName = 'deepseek';
        
        // Deepseek-specific settings
        this.maxContextLength = 25000; // tokens
        this.preferredChunkSize = 12000; // tokens
        this.overlapSize = 500; // tokens for context continuity
    }

    /**
     * Process PDF with Deepseek-specific optimizations
     */
    async processPdf(filePath) {
        // Get base processing result
        const baseResult = await this.baseProcessor.processPdf(filePath);
        
        // Enhance chunks with Deepseek-specific formatting
        const enhancedChunks = baseResult.raw_content.chunks.map((chunk, index) => ({
            text: this.formatForDeepseek(chunk.text),
            metadata: {
                ...chunk.metadata,
                model: 'deepseek',
                chunk_index: index + 1,
                total_chunks: baseResult.raw_content.chunks.length,
                context_window: this.maxContextLength,
                processing_notes: this.getProcessingNotes(chunk)
            },
            estimated_tokens: chunk.estimated_tokens
        }));

        return {
            ...baseResult,
            raw_content: {
                ...baseResult.raw_content,
                chunks: enhancedChunks
            },
            model_meta: {
                name: this.modelName,
                max_context_length: this.maxContextLength,
                preferred_chunk_size: this.preferredChunkSize,
                overlap_size: this.overlapSize
            }
        };
    }

    /**
     * Format text specifically for Deepseek's preferences
     */
    formatForDeepseek(text) {
        // Add clear section markers
        text = text.replace(/\[Section: ([^\]]+)\]/g, '### $1 ###\n');
        
        // Enhance email formatting
        text = text.replace(/Subject: /g, '\n=== Subject: ');
        
        // Add paragraph breaks for readability
        text = text.replace(/\n{3,}/g, '\n\n');
        
        return text;
    }

    /**
     * Generate processing notes for chunk metadata
     */
    getProcessingNotes(chunk) {
        const notes = [];
        
        // Add structural notes
        if (chunk.metadata.type === 'complete_document') {
            notes.push('Complete document in single chunk');
        } else if (chunk.metadata.continues) {
            notes.push('Continues from previous chunk');
        }
        
        // Add content type notes
        if (chunk.text.includes('Subject:')) {
            notes.push('Contains email threads');
        }
        if (chunk.text.includes('Page')) {
            notes.push('Contains page markers');
        }
        
        return notes;
    }
}

export default new DeepseekProcessor();
