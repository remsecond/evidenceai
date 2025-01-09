import { validateFile } from '../../src/utils/file-validator.js';
import { processDocument } from '../../src/services/document-processing.js';
import { getLogger } from '../../src/utils/logging.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

describe('Token Limit Handling', () => {
    test('handles document at original issue size (245,988 tokens)', async () => {
        // Load test file
        const content = await fs.readFile(
            'tests/fixtures/edge_cases/token_limit_test.txt',
            'utf8'
        );

        // Verify size matches reported issue
        const chars = content.length;
        const estimatedTokens = Math.ceil(chars / 4);
        expect(estimatedTokens).toBeCloseTo(245988, -2); // Within 1% accuracy

        // Validate file
        const validation = await validateFile(content);
        
        // Should identify as needing chunking
        expect(validation.size.estimatedTokens).toBeGreaterThan(200000);
        expect(validation.size.requiresChunking).toBe(true);

        // Process with chunking
        const result = await processDocument(content);

        // Verify chunking occurred
        expect(result.metadata.chunking.total_chunks).toBeGreaterThan(1);

        // Verify each chunk is within limits
        const maxChunkTokens = result.metadata.chunking.chunks.reduce(
            (max, chunk) => Math.max(max, chunk.tokens),
            0
        );
        expect(maxChunkTokens).toBeLessThanOrEqual(150000);

        // Verify no data loss
        const totalProcessedTokens = result.metadata.chunking.chunks.reduce(
            (sum, chunk) => sum + chunk.tokens,
            0
        );
        expect(totalProcessedTokens).toBeCloseTo(estimatedTokens, -2);
    });

    test('maintains context across chunk boundaries', async () => {
        const content = await fs.readFile(
            'tests/fixtures/edge_cases/token_limit_test.txt',
            'utf8'
        );

        const result = await processDocument(content);

        // Verify chunk structure and metadata
        const chunks = result.raw_content.chunks;
        expect(chunks.length).toBeGreaterThan(1);

        // Check each chunk has proper metadata
        chunks.forEach((chunk, index) => {
            expect(chunk.metadata).toEqual(
                expect.objectContaining({
                    type: expect.any(String),
                    section: expect.any(String),
                    position: index,
                    total_chunks: chunks.length
                })
            );
        });

        // Verify section continuity
        let currentSection = '';
        chunks.forEach((chunk, index) => {
            if (chunk.metadata.type === 'partial_section' && chunk.metadata.continues) {
                // Next chunk should continue the same section
                expect(chunks[index + 1].metadata.section).toBe(chunk.metadata.section);
            }
            if (chunk.metadata.section !== currentSection) {
                // Section transition should be marked appropriately
                if (currentSection !== '') {
                    expect(chunks[index - 1].metadata.continues).toBe(false);
                }
                currentSection = chunk.metadata.section;
            }
        });

        // Verify document structure preservation
        const allText = chunks.map(c => c.text).join('');
        expect(allText).toContain('Test Document');
        expect(allText).toContain('End of Test Document');

        // Verify metadata preservation across chunks
        const foundHeaders = new Set();
        chunks.forEach(chunk => {
            if (chunk.text.includes('From:')) foundHeaders.add('from');
            if (chunk.text.includes('To:')) foundHeaders.add('to');
            if (chunk.text.includes('Subject:')) foundHeaders.add('subject');
            if (chunk.text.includes('Date:')) foundHeaders.add('date');
        });
        expect(foundHeaders.size).toBe(4); // All headers were preserved somewhere in the chunks
    });

    test('processes chunks in parallel for efficiency', async () => {
        const content = await fs.readFile(
            'tests/fixtures/edge_cases/token_limit_test.txt',
            'utf8'
        );

        const startTime = Date.now();
        const result = await processDocument(content);
        const duration = Date.now() - startTime;

        // Calculate and verify processing efficiency
        const serialTime = result.metadata.chunking.chunks.reduce(
            (total, chunk) => total + chunk.processing_time,
            0
        );

        // Parallel processing should be significantly faster
        expect(duration).toBeLessThan(serialTime * 0.8); // At least 20% faster

        // Verify efficiency metrics
        const efficiency = result.metadata.processing_stats.efficiency;
        expect(efficiency).toEqual(
            expect.objectContaining({
                parallel_efficiency: expect.any(Number),
                chunk_efficiency: expect.any(Number),
                overall_efficiency: expect.any(Number)
            })
        );

        // Verify reasonable efficiency values
        expect(efficiency.parallel_efficiency).toBeGreaterThan(0.5);
        expect(efficiency.chunk_efficiency).toBeGreaterThan(0.7);
        expect(efficiency.overall_efficiency).toBeGreaterThan(0.4);

        // Verify chunk size distribution
        const chunkSizes = result.raw_content.chunks.map(c => c.estimated_tokens);
        const avgSize = chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length;
        const maxSize = Math.max(...chunkSizes);
        
        // No chunk should exceed the limit
        expect(maxSize).toBeLessThanOrEqual(150000);
        
        // Chunks should be reasonably balanced
        const sizeVariance = Math.max(...chunkSizes.map(s => Math.abs(s - avgSize)));
        expect(sizeVariance / avgSize).toBeLessThan(0.3); // Max 30% variance
    });
});
