import { validateFile } from '../../src/utils/file-validator.js';
import { processDocument } from '../../src/services/document-processing.js';
import { getLogger } from '../../src/utils/logging.js';

const logger = getLogger();

describe('Token Limit Handling', () => {
    test('handles document near token limit (200k)', async () => {
        // Create content that would be ~200k tokens (800k chars)
        const content = 'A'.repeat(800 * 1024);
        
        const validation = await validateFile(content);
        expect(validation.canProcess).toBe(true);
        expect(validation.size.estimatedTokens).toBeLessThanOrEqual(200000);
    });

    test('rejects document exceeding token limit (250k)', async () => {
        // Create content that would be ~250k tokens (1M chars)
        const content = 'A'.repeat(1000 * 1024);
        
        const validation = await validateFile(content);
        expect(validation.canProcess).toBe(false);
        expect(validation.size.estimatedTokens).toBeGreaterThan(200000);
    });

    test('handles document requiring multiple chunks', async () => {
        // Create content that requires 3 chunks (~450k chars = ~112.5k tokens)
        const content = 'A'.repeat(450 * 1024);
        
        const validation = await validateFile(content);
        expect(validation.canProcess).toBe(true);
        
        const result = await processDocument(content);
        expect(result.metadata.chunking.total_chunks).toBeGreaterThan(1);
        expect(result.metadata.chunking.size_analysis.estimated_tokens).toBeLessThan(150000);
    });

    test('handles the specific reported case (245,988 tokens)', async () => {
        // Create content matching the reported size
        // 245,988 tokens * 4 chars/token = 983,952 chars
        const content = 'A'.repeat(983952);
        
        const validation = await validateFile(content);
        
        // Should identify as too large
        expect(validation.canProcess).toBe(false);
        expect(validation.size.estimatedTokens).toBeCloseTo(245988, -3); // Within 1000 tokens
        
        // Should suggest chunking in error message
        expect(validation.errors[0]).toContain('split');
    });

    test('verifies chunk size limits', async () => {
        const testCases = [
            { size: 0.5, expectedChunks: 1 },    // 0.5MB - single chunk
            { size: 1.0, expectedChunks: 2 },    // 1.0MB - two chunks
            { size: 2.0, expectedChunks: 4 },    // 2.0MB - four chunks
            { size: 5.0, expectedChunks: 9 }     // 5.0MB - nine chunks
        ];

        for (const { size, expectedChunks } of testCases) {
            const chars = Math.floor(size * 1024 * 1024);
            const content = 'A'.repeat(chars);
            
            const validation = await validateFile(content);
            expect(validation.canProcess).toBe(true);
            
            const result = await processDocument(content);
            expect(result.metadata.chunking.total_chunks).toBeCloseTo(expectedChunks, 0);
            
            // Verify each chunk is within limits
            const avgChunkSize = result.metadata.processing_stats.avg_chunk_size;
            expect(avgChunkSize).toBeLessThanOrEqual(150000); // 150k tokens max
        }
    });

    test('maintains context across chunks', async () => {
        // Create content with identifiable sections
        const sections = Array(10).fill(0).map((_, i) => 
            `=== Section ${i + 1} ===\n` +
            `This is the content for section ${i + 1}.\n`.repeat(1000)
        );
        
        const content = sections.join('\n');
        const result = await processDocument(content);

        // Verify chunking occurred
        expect(result.metadata.chunking.total_chunks).toBeGreaterThan(1);

        // Verify section recognition across chunks
        expect(result.structure).toHaveProperty('sections');
        expect(result.structure.sections).toHaveLength(10);

        // Verify no data loss
        const totalTokens = result.metadata.processing_stats.total_tokens_processed;
        const expectedTokens = Math.ceil(content.length / 4);
        expect(totalTokens).toBeCloseTo(expectedTokens, -2); // Within 1% accuracy
    });

    test('handles edge cases near chunk boundaries', async () => {
        // Test content that lands right at chunk boundaries
        const chunkSize = 150000 * 4; // 150k tokens * 4 chars/token
        const testSizes = [
            chunkSize - 100,      // Just under one chunk
            chunkSize + 100,      // Just over one chunk
            chunkSize * 2 - 100,  // Just under two chunks
            chunkSize * 2 + 100   // Just over two chunks
        ];

        for (const size of testSizes) {
            const content = 'A'.repeat(size);
            const validation = await validateFile(content);
            expect(validation.canProcess).toBe(true);

            const result = await processDocument(content);
            const expectedChunks = Math.ceil(size / chunkSize);
            expect(result.metadata.chunking.total_chunks).toBe(expectedChunks);
        }
    });
});
