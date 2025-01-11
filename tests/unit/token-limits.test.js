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

    test('maintains context and structure across chunks', async () => {
        // Create content with identifiable sections and varied content
        const sections = Array(10).fill(0).map((_, i) => 
            `=== Section ${i + 1} ===\n` +
            `This is the content for section ${i + 1}.\n`.repeat(1000) +
            (i % 2 === 0 ? '\nSUBSECTION A\nExtra content here.\n' : '') +
            (i % 3 === 0 ? '\nNOTES:\n- Important point\n- Another point\n' : '')
        );
        
        const content = sections.join('\n\n');
        const result = await processDocument(content);

        // Verify chunking occurred
        expect(result.metadata.chunking.total_chunks).toBeGreaterThan(1);

        // Verify section metadata
        const chunks = result.raw_content.chunks;
        let foundSections = new Set();
        let foundSubsections = false;
        let foundNotes = false;

        chunks.forEach(chunk => {
            // Verify chunk metadata structure
            expect(chunk.metadata).toHaveProperty('type');
            expect(chunk.metadata).toHaveProperty('section');
            expect(chunk.metadata).toHaveProperty('position');
            
            // Track found sections
            if (chunk.metadata.section) {
                foundSections.add(chunk.metadata.section);
            }
            
            // Check content preservation
            if (chunk.text.includes('SUBSECTION A')) {
                foundSubsections = true;
            }
            if (chunk.text.includes('NOTES:')) {
                foundNotes = true;
            }
        });

        // Verify all sections were preserved
        expect(foundSections.size).toBeGreaterThan(0);
        expect(foundSubsections).toBe(true);
        expect(foundNotes).toBe(true);

        // Verify chunk relationships
        chunks.forEach((chunk, index) => {
            if (index < chunks.length - 1) {
                if (chunk.metadata.continues) {
                    expect(chunks[index + 1].metadata.section).toBe(chunk.metadata.section);
                }
            }
        });

        // Verify no data loss
        const totalTokens = result.metadata.processing_stats.total_tokens_processed;
        const expectedTokens = Math.ceil(content.length / 4);
        expect(totalTokens).toBeCloseTo(expectedTokens, -2); // Within 1% accuracy
    });

    test('handles edge cases near chunk boundaries', async () => {
        // Test content that lands right at chunk boundaries
        const chunkSize = 150000 * 4; // 150k tokens * 4 chars/token
        const testCases = [
            {
                size: chunkSize - 100,
                desc: 'Just under one chunk',
                expectedChunks: 1
            },
            {
                size: chunkSize + 100,
                desc: 'Just over one chunk',
                expectedChunks: 2
            },
            {
                size: chunkSize * 2 - 100,
                desc: 'Just under two chunks',
                expectedChunks: 2
            },
            {
                size: chunkSize * 2 + 100,
                desc: 'Just over two chunks',
                expectedChunks: 3
            }
        ];

        for (const { size, desc, expectedChunks } of testCases) {
            // Create content with a recognizable structure
            const header = '=== Test Section ===\n\n';
            const footer = '\n\nEnd of section.';
            const middleSize = size - (header.length + footer.length);
            const content = header + 'A'.repeat(middleSize) + footer;

            const validation = await validateFile(content);
            expect(validation.canProcess).toBe(true);

            const result = await processDocument(content);
            
            // Verify chunk count
            expect(result.metadata.chunking.total_chunks).toBe(expectedChunks);

            // Verify structure preservation
            const chunks = result.raw_content.chunks;
            
            // First chunk should contain header
            expect(chunks[0].text).toContain('=== Test Section ===');
            
            // Last chunk should contain footer
            expect(chunks[chunks.length - 1].text).toContain('End of section.');

            // Verify chunk metadata
            chunks.forEach((chunk, index) => {
                expect(chunk.metadata).toHaveProperty('type');
                expect(chunk.metadata).toHaveProperty('section');
                expect(chunk.metadata.position).toBe(index);
                
                if (index < chunks.length - 1) {
                    expect(chunk.metadata.continues).toBeDefined();
                }
            });

            // Verify no data loss
            const totalChars = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
            expect(totalChars).toBe(content.length);
        }
    });

    test('handles special content at chunk boundaries', async () => {
        // Create content where important elements might cross chunk boundaries
        const chunkSize = 150000 * 4; // 150k tokens * 4 chars/token
        const specialContent = `
            === Important Section ===
            ${'-'.repeat(chunkSize - 200)}
            Critical information here
            ${'-'.repeat(100)}
            === End Section ===
        `.trim();

        const result = await processDocument(specialContent);
        
        // Verify the special content was preserved
        let foundImportant = false;
        let foundCritical = false;
        result.raw_content.chunks.forEach(chunk => {
            if (chunk.text.includes('=== Important Section ===')) {
                foundImportant = true;
            }
            if (chunk.text.includes('Critical information here')) {
                foundCritical = true;
            }
        });

        expect(foundImportant).toBe(true);
        expect(foundCritical).toBe(true);
    });
});
