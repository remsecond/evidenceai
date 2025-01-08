import { analyzeText } from '../../src/services/ai.js';
import { processDocument } from '../../src/services/document-processing.js';
import fs from 'fs/promises';
import path from 'path';

describe('File Size Limits', () => {
    // Generate test files of various sizes
    async function generateTestFile(sizeInMB) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,\n';
        const charsPerMB = 1024 * 1024;
        let content = '';
        
        // Generate realistic-looking text with paragraphs
        for (let i = 0; i < sizeInMB * charsPerMB; i += 100) {
            if (i % 1000 === 0) content += '\n\n'; // New paragraph
            content += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        const filePath = path.join(process.cwd(), 'tests', 'fixtures', `test_${sizeInMB}mb.txt`);
        await fs.writeFile(filePath, content);
        return filePath;
    }

    // Test sizes in MB:
    // - 0.6MB ≈ 150k tokens (single chunk limit)
    // - 1.2MB ≈ 300k tokens (2 chunks)
    // - 2.4MB ≈ 600k tokens (4 chunks)
    // - 4.8MB ≈ 1.2M tokens (8 chunks)
    // - 9.6MB ≈ 2.4M tokens (16 chunks)
    // - 19.2MB ≈ 4.8M tokens (32 chunks)
    const testSizes = [0.6, 1.2, 2.4, 4.8, 9.6, 19.2];

    test.each(testSizes)('handles %dMB file correctly', async (size) => {
        const filePath = await generateTestFile(size);
        const content = await fs.readFile(filePath, 'utf8');
        
        const result = await processDocument(content);
        
        // Calculate metrics
        const totalChars = content.length;
        const estimatedTokens = Math.ceil(totalChars / 4);
        const chunksNeeded = Math.ceil(estimatedTokens / 150000);
        
        // Log detailed metrics
        console.log('\nFile Size Analysis:');
        console.log('------------------');
        console.log(`File size: ${size.toFixed(1)}MB (${totalChars.toLocaleString()} characters)`);
        console.log(`Estimated tokens: ${estimatedTokens.toLocaleString()}`);
        console.log(`Theoretical chunks needed: ${chunksNeeded}`);
        console.log(`Actual chunks used: ${result.metadata.chunking.chunk_count}`);
        console.log(`Average chunk size: ${Math.floor(estimatedTokens / result.metadata.chunking.chunk_count).toLocaleString()} tokens`);
        console.log(`Processing time: ${result.metadata.processing_time}ms`);
        if (result.metadata.chunking.chunk_sizes) {
            console.log('Chunk sizes:', result.metadata.chunking.chunk_sizes.map(s => 
                `${Math.floor(s/4).toLocaleString()} tokens`).join(', '));
        }
        
        // Verify chunking worked
        expect(result.success).toBe(true);
        expect(result.metadata.chunking.enabled).toBe(true);
        expect(result.metadata.chunking.chunk_count).toBe(chunksNeeded);
        
        // Clean up
        await fs.unlink(filePath);
    });

    test('fails gracefully on extremely large files', async () => {
        // Test with a file that would require too many chunks
        // Test with 40MB (≈ 10M tokens, should exceed our processing limits)
        const extremeSize = 40;
        const filePath = await generateTestFile(extremeSize);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Should throw an error about file being too large
        await expect(processDocument(content)).rejects.toThrow(/file too large/i);
        
        // Clean up
        await fs.unlink(filePath);
    });

    test('handles edge cases', async () => {
        const edgeCases = [
            { size: 0.599, desc: 'Just under single chunk (≈149,750 tokens)' },
            { size: 0.601, desc: 'Just over single chunk (≈150,250 tokens)' },
            { size: 1.199, desc: 'Just under two chunks (≈299,750 tokens)' },
            { size: 1.201, desc: 'Just over two chunks (≈300,250 tokens)' },
            { size: 20, desc: 'Large but processable (≈5M tokens)' },
            { size: 30, desc: 'Very large but processable (≈7.5M tokens)' }
        ];

        for (const { size, desc } of edgeCases) {
            console.log(`Testing ${desc} (${size}MB)`);
            const filePath = await generateTestFile(size);
            const content = await fs.readFile(filePath, 'utf8');
            
            const result = await processDocument(content);
            const expectedChunks = Math.ceil((size * 1024 * 1024) / (150000 * 4));
            
            expect(result.metadata.chunking.chunk_count).toBe(expectedChunks);
            
            await fs.unlink(filePath);
        }
    });
});
