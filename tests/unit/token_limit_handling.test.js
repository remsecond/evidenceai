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

        // Verify section headers were preserved
        expect(result.metadata.structure.sections).toContain('Test Document');
        expect(result.metadata.structure.sections).toContain('End of Test Document');

        // Verify metadata was preserved
        expect(result.metadata.headers).toEqual(
            expect.objectContaining({
                from: 'test@example.com',
                to: 'recipient@example.com',
                subject: expect.stringContaining('Token Limit Test'),
                date: expect.any(String)
            })
        );
    });

    test('processes chunks in parallel for efficiency', async () => {
        const content = await fs.readFile(
            'tests/fixtures/edge_cases/token_limit_test.txt',
            'utf8'
        );

        const startTime = Date.now();
        const result = await processDocument(content);
        const duration = Date.now() - startTime;

        // Calculate theoretical serial processing time
        const serialTime = result.metadata.chunking.chunks.reduce(
            (total, chunk) => total + chunk.processing_time,
            0
        );

        // Parallel processing should be significantly faster
        expect(duration).toBeLessThan(serialTime * 0.8); // At least 20% faster

        // Verify parallel efficiency metrics
        expect(result.metadata.processing_stats.efficiency).toEqual(
            expect.objectContaining({
                parallel_efficiency: expect.any(Number),
                chunk_efficiency: expect.any(Number)
            })
        );
        expect(result.metadata.processing_stats.efficiency.parallel_efficiency).toBeGreaterThan(0.5);
    });
});
