import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfProcessor from '../src/services/pdf-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Smart Chunking', () => {
    // Use test fixture
    const testFile = path.join(__dirname, 'fixtures', 'sample-email.txt');
    let result;

    before(async () => {
        // Verify file exists
        if (!fs.existsSync(testFile)) {
            throw new Error(`Test file not found: ${testFile}`);
        }
        result = await pdfProcessor.process(testFile);
        console.log('Processing stats:', {
            chunks: result.statistics.chunks,
            avg_tokens: result.statistics.average_tokens_per_chunk,
            total_tokens: result.statistics.estimated_total_tokens
        });

        // Log first chunk for analysis
        const firstChunk = result.raw_content.chunks[0];
        console.log('\nFirst chunk preview:', {
            text: firstChunk.text.slice(0, 500) + '...',
            metadata: firstChunk.metadata,
            estimated_tokens: firstChunk.metadata.estimated_tokens
        });
    });

    it('should respect maximum token limit', () => {
        const maxTokens = 25000;
        const allChunks = result.raw_content.chunks;
        
        allChunks.forEach((chunk, i) => {
            expect(
                chunk.metadata.estimated_tokens,
                `Chunk ${i + 1} exceeds token limit`
            ).to.be.at.most(maxTokens);
        });
    });

    it('should target reasonable chunk size', () => {
        // Real-world token sizes are smaller due to message boundaries
        const targetSize = 150; // Average tokens per message
        const tolerance = 0.5; // Allow 50% deviation
        
        // Use the statistics from the result
        const avgTokens = result.statistics.average_tokens_per_chunk;
        
        expect(
            avgTokens,
            `Average chunk size (${avgTokens}) far from target (${targetSize})`
        ).to.be.approximately(targetSize, targetSize * tolerance);
    });

    it('should maintain context overlap', () => {
        const minOverlap = 50; // tokens for test files
        const allChunks = result.raw_content.chunks;
        
        // Check consecutive chunks for overlap
        for (let i = 1; i < allChunks.length; i++) {
            // Skip if chunks are from different messages
            if (!allChunks[i].metadata.continues_from) continue;

            const prevChunk = allChunks[i - 1];
            const currChunk = allChunks[i];
            
            // Check metadata overlap
            expect(
                currChunk.metadata.overlap_tokens,
                `Insufficient overlap between chunks ${i} and ${i + 1}`
            ).to.be.at.least(minOverlap);

            // Verify actual text overlap
            const prevEnd = prevChunk.text.slice(-1000);
            const currStart = currChunk.text.slice(0, 1000);
            const overlap = findOverlap(prevEnd, currStart);
            const overlapTokens = estimateTokens(overlap);
            
            expect(
                overlapTokens,
                `Text overlap between chunks ${i} and ${i + 1} doesn't match metadata`
            ).to.be.approximately(currChunk.metadata.overlap_tokens, 50); // Allow 50 token variance for test files
        }
    });

    it('should preserve message boundaries', () => {
        const allChunks = result.raw_content.chunks;
        const format = result.raw_content.structure.format;
        
        allChunks.forEach((chunk, i) => {
            // Check chunk starts based on format
            let validStart = false;
            
            if (format === 'ofw') {
                validStart = /^Message \d+ of \d+/.test(chunk.text.trim());
            } else {
                // For email format, check for header fields
                validStart = /^(Subject|From|To|Date):/.test(chunk.text.trim());
            }
            
            // Or continues from previous chunk
            const isContinuation = chunk.metadata.continues_from !== undefined;
            
            expect(
                validStart || isContinuation,
                `Chunk ${i + 1} breaks message boundary`
            ).to.be.true;
        });
    });
});

// Helper functions
function findOverlap(text1, text2) {
    let overlap = '';
    const minLength = 10; // Minimum meaningful overlap
    
    // Try increasingly smaller portions
    for (let i = text1.length; i >= minLength; i--) {
        const portion = text1.slice(-i);
        if (text2.startsWith(portion)) {
            overlap = portion;
            break;
        }
    }
    
    return overlap;
}

function estimateTokens(text) {
    // Use same estimation as processor
    return Math.ceil(text.length / 3.2);
}
