import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Initialize logger
const logger = {
    info: console.log,
    debug: console.debug,
    error: console.error
};

// Maximum tokens per chunk (staying within context limits)
const MAX_CHUNK_SIZE = 25000; // 25k tokens per chunk to avoid context limits

/**
 * Split text into chunks that respect token limits
 */
/**
 * Split text into chunks while preserving structure and context
 * Optimized for LLM processing based on preprocessing best practices
 */
function chunkText(text, maxSize = MAX_CHUNK_SIZE) {
    // Estimate tokens (rough approximation: 4 chars = 1 token)
    const estimatedTokens = text.length / 4;
    logger.debug(`Chunking text: ${text.length} chars, ≈${Math.ceil(estimatedTokens)} tokens`);
    
    if (estimatedTokens <= maxSize) {
        logger.debug('Text fits in single chunk');
        return [{
            text,
            metadata: {
                type: 'complete_document',
                section: 'full',
                position: 0,
                total_chunks: 1
            }
        }];
    }

    // First pass: identify structure markers (headers, sections)
    const sections = identifySections(text);
    logger.debug(`Identified ${sections.length} logical sections`);

    // Second pass: create chunks respecting section boundaries
    const chunks = [];
    let currentChunk = '';
    let currentSize = 0;
    let currentSection = '';
    let sectionStart = true;

    for (const section of sections) {
        const { header, content } = section;
        const paragraphs = content.split(/\n\s*\n/);
        
        for (const paragraph of paragraphs) {
            const paragraphTokens = paragraph.length / 4;
            const wouldExceedLimit = currentSize + paragraphTokens > maxSize;
            
            // Start new chunk if:
            // 1. Current chunk would exceed limit
            // 2. We're at a section boundary and current chunk is substantial
            if (wouldExceedLimit || (sectionStart && currentChunk && currentSize > maxSize * 0.5)) {
                if (currentChunk) {
                    chunks.push({
                        text: currentChunk,
                        metadata: {
                            type: 'partial_section',
                            section: currentSection,
                            position: chunks.length,
                            continues: wouldExceedLimit && !sectionStart
                        }
                    });
                    currentChunk = '';
                    currentSize = 0;
                }
            }

            // Add section header at chunk start
            if (!currentChunk && header) {
                currentChunk = `[Section: ${header}]\n\n`;
                currentSection = header;
            }

            // Handle oversized paragraphs
            if (paragraphTokens > maxSize) {
                logger.debug(`Large paragraph found: ≈${Math.ceil(paragraphTokens)} tokens`);
                const subChunks = splitLongParagraph(paragraph, maxSize);
                subChunks.forEach((subChunk, index) => {
                    chunks.push({
                        text: subChunk,
                        metadata: {
                            type: 'split_paragraph',
                            section: currentSection,
                            position: chunks.length,
                            part: index + 1,
                            total_parts: subChunks.length
                        }
                    });
                });
            } else {
                // Add paragraph to current chunk
                currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
                currentSize += paragraphTokens;
            }

            sectionStart = false;
        }
        sectionStart = true;
    }

    // Add final chunk
    if (currentChunk) {
        chunks.push({
            text: currentChunk,
            metadata: {
                type: 'section_end',
                section: currentSection,
                position: chunks.length,
                continues: false
            }
        });
    }

    logger.debug(`Created ${chunks.length} structured chunks`);
    chunks.forEach((chunk, i) => {
        logger.debug(`Chunk ${i + 1}: ≈${Math.ceil(chunk.text.length / 4)} tokens, Section: ${chunk.metadata.section}`);
    });

    return chunks;
}

/**
 * Identify logical sections in the text based on formatting and content
 */
function identifySections(text) {
    const sections = [];
    let currentHeader = '';
    let currentContent = '';

    // Split into lines for analysis
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1]?.trim() || '';
        
        // Heuristics for header detection:
        // 1. Short line followed by blank line
        // 2. All caps or numbered line
        // 3. Line followed by underline characters
        const isHeader = (
            (line.length > 0 && line.length < 100 && nextLine === '') ||
            (line === line.toUpperCase() && line.length > 3) ||
            (line.match(/^\d+[\.\)]/)) ||
            (nextLine.match(/^[=\-_]{3,}$/))
        );

        if (isHeader) {
            if (currentContent) {
                sections.push({ header: currentHeader, content: currentContent.trim() });
            }
            currentHeader = line;
            currentContent = '';
            if (nextLine.match(/^[=\-_]{3,}$/)) i++; // Skip underline
        } else if (line || nextLine) {
            currentContent += (currentContent ? '\n' : '') + line;
        }
    }

    // Add final section
    if (currentContent) {
        sections.push({ header: currentHeader, content: currentContent.trim() });
    }

    return sections;
}

/**
 * Split a single long paragraph into smaller chunks while attempting to preserve
 * sentence boundaries and context
 */
function splitLongParagraph(paragraph, maxSize) {
    const chunks = [];
    const estimatedChunkLength = (maxSize * 4) - 100; // Convert tokens to chars, leave some buffer
    
    // Try to split at sentence boundaries first
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > estimatedChunkLength) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = sentence;
            } else {
                // Single sentence is too long, force split at word boundaries
                const words = sentence.split(/\s+/);
                let partialChunk = '';
                
                for (const word of words) {
                    if ((partialChunk + ' ' + word).length > estimatedChunkLength) {
                        if (partialChunk) chunks.push(partialChunk);
                        partialChunk = word;
                    } else {
                        partialChunk = partialChunk ? `${partialChunk} ${word}` : word;
                    }
                }
                
                if (partialChunk) chunks.push(partialChunk);
            }
        } else {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks;
}


/**
 * Extract raw text and metadata from PDF without interpretation
 * Follows "Retain Raw Data" principle from metadata requirements
 * Implements chunking for large PDFs
 */
export async function processPdf(filePath) {
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
        logger.debug('File info collected:', fileInfo);

        // Read and parse PDF
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer, {
            // Prevent pdf-parse from looking for test files
            max: 0
        });

        // Extract and chunk raw content with enhanced structure
        const text = pdfData.text;
        const structuredChunks = chunkText(text);
        
        const rawContent = {
            text: text, // Complete, unaltered text
            chunks: structuredChunks.map(chunk => ({
                text: chunk.text,
                estimated_tokens: Math.ceil(chunk.text.length / 4),
                metadata: {
                    ...chunk.metadata,
                    total_chunks: structuredChunks.length
                }
            })),
            structure: {
                pages: pdfData.numpages,
                version: pdfData.pdfInfo?.PDFFormatVersion,
                info: pdfData.info // Raw PDF metadata
            }
        };
        logger.debug('Raw content extracted and chunked');

        // Calculate basic text statistics
        const paragraphs = pdfData.text.split(/\n\s*\n/);
        const words = pdfData.text.match(/\S+/g) || [];
        const statistics = {
            characters: pdfData.text.length,
            words: words.length,
            paragraphs: paragraphs.length,
            average_paragraph_length: paragraphs.length > 0 ? 
                Math.round(words.length / paragraphs.length) : 0,
            chunks: structuredChunks.length,
            average_chunk_size: Math.round(pdfData.text.length / (4 * structuredChunks.length)), // in tokens
            estimated_total_tokens: Math.ceil(pdfData.text.length / 4)
        };
        logger.debug('Text statistics calculated');

        // Compile results
        const result = {
            file_info: fileInfo,
            raw_content: rawContent,
            statistics: statistics,
            processing_meta: {
                timestamp: new Date().toISOString(),
                version: "1.0",
                processing_time_ms: Date.now() - startTime
            }
        };

        logger.info('PDF processing complete', {
            pages: rawContent.structure.pages,
            words: statistics.words,
            processing_time: result.processing_meta.processing_time_ms
        });

        return result;

    } catch (error) {
        logger.error('Error processing PDF:', error);
        throw error;
    }
}

export default {
    processPdf
};
