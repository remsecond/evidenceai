import fs from 'fs';
import path from 'path';
import BaseProcessor from '../base-processor.js';
import pdfProcessor from '../pdf-processor.js';

/**
 * Deepseek-specific processor that extends base processor
 * with Deepseek's context handling and formatting preferences
 */
class DeepseekProcessor extends BaseProcessor {
    constructor() {
        super();
        this.pdfProcessor = pdfProcessor;
        this.modelName = 'deepseek';
        
        // Override with Deepseek-specific settings
        this.maxInputSize = 25000; // tokens
        this.preferredChunkSize = 12000; // tokens
        this.overlapSize = 500; // tokens for context continuity
        
        // Deepseek formatting preferences
        this.sectionMarker = '###';
        this.emailMarker = '===';
        this.listMarker = '•';
    }

    /**
     * Pre-process text before Deepseek-specific formatting
     */
    async preProcess(text) {
        return {
            normalized: text,
            metadata: {
                type: 'text',
                format: 'plain',
                context: {
                    document_type: 'text',
                    formatting: {
                        has_headers: false,
                        has_lists: false,
                        has_tables: false,
                        has_code_blocks: false
                    }
                }
            },
            structure: {
                sections: [],
                references: new Set()
            }
        };
    }

    /**
     * Process PDF with preprocessing and Deepseek-specific optimizations
     */
    async processPdf(filePath) {
        // Get PDF processing result
        const pdfResult = await this.pdfProcessor.processPdf(filePath);
        
        // Apply base preprocessing to each chunk
        const processedChunks = await Promise.all(
            pdfResult.raw_content.chunks.map(async (chunk, index) => {
                // Pre-process chunk content
                const processed = await this.preProcess(chunk.text);
                
                // Apply Deepseek-specific formatting
                return {
                    text: this.formatForDeepseek(processed.normalized),
                    metadata: {
                        ...chunk.metadata,
                        ...processed.metadata,
                        model: 'deepseek',
                        chunk_index: index + 1,
                        total_chunks: pdfResult.raw_content.chunks.length,
                        context_window: this.maxInputSize,
                        processing_notes: this.getProcessingNotes(processed)
                    },
                    structure: processed.structure,
                    estimated_tokens: chunk.estimated_tokens
                };
            })
        );

        return {
            ...pdfResult,
            raw_content: {
                ...pdfResult.raw_content,
                chunks: processedChunks
            },
            model_meta: {
                name: this.modelName,
                max_context_length: this.maxInputSize,
                preferred_chunk_size: this.preferredChunkSize,
                overlap_size: this.overlapSize,
                formatting: {
                    section_marker: this.sectionMarker,
                    email_marker: this.emailMarker,
                    list_marker: this.listMarker
                }
            }
        };
    }

    /**
     * Format text with Deepseek's preferences after preprocessing
     */
    formatForDeepseek(text) {
        // Add section markers
        text = text.replace(/\[Section: ([^\]]+)\]/g, `${this.sectionMarker} $1 ${this.sectionMarker}\n`);
        
        // Format email headers
        text = text.replace(/^(From|To|Subject|Date|Cc): /gm, (match) => `\n${this.emailMarker} ${match}`);
        
        // Format lists
        text = text.replace(/^[-*]\s/gm, `${this.listMarker} `);
        
        // Add semantic markers
        text = text.replace(/^(IMPORTANT|NOTE|WARNING):/gm, `${this.sectionMarker} $1 ${this.sectionMarker}`);
        
        // Enhance code blocks
        text = text.replace(/```(\w+)?\n([\s\S]+?)```/g, (_, lang, code) => 
            `${this.sectionMarker} CODE ${lang || ''} ${this.sectionMarker}\n${code.trim()}\n${this.sectionMarker} END CODE ${this.sectionMarker}`
        );
        
        return text;
    }

    /**
     * Generate enhanced processing notes based on preprocessing results
     */
    getProcessingNotes(processed) {
        const notes = [];
        
        // Document structure notes
        const docType = processed.metadata?.context?.document_type || 'text';
        if (docType === 'email') {
            notes.push('Email thread structure preserved');
            notes.push(`Contains ${processed.structure?.sections?.length || 0} email messages`);
        }
        
        // Content formatting notes
        const formatting = processed.metadata?.context?.formatting || {};
        if (formatting.has_headers) notes.push('Section headers preserved');
        if (formatting.has_lists) notes.push('List formatting enhanced');
        if (formatting.has_tables) notes.push('Table structure maintained');
        if (formatting.has_code_blocks) notes.push('Code blocks formatted');
        
        // Reference tracking
        const refCount = processed.structure?.references?.size || 0;
        if (refCount > 0) {
            notes.push(`Cross-references tracked: ${refCount}`);
        }
        
        return notes;
    }
}

export default new DeepseekProcessor();
