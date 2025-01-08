import { analyzeText, summarizeText, generateText } from '../../src/services/ai.js';
import { processEmail } from '../../src/services/email-processing.js';
import { processOFW } from '../../src/services/ofw-processing.js';
import { analyzeOutliers } from '../../src/services/outlier-analysis.js';
import { processDocument } from '../../src/services/document-processing.js';
import { routeDocument } from '../../src/services/document-router.js';

/**
 * Generate a document of specified size in estimated tokens
 */
function generateLargeDocument(tokenCount) {
    // Approximate 4 chars per token
    const charCount = tokenCount * 4;
    const paragraphSize = 500;
    const paragraphs = [];
    
    for (let i = 0; i < charCount; i += paragraphSize) {
        paragraphs.push(`Paragraph ${Math.floor(i/paragraphSize)}: ${'x'.repeat(paragraphSize)}`);
    }
    
    return paragraphs.join('\n\n');
}

describe('Chunking Architecture Requirements', () => {
    describe('Token Limits', () => {
        const largeDoc = generateLargeDocument(250000); // Exceeds 200k limit

        it('ai.js handles large documents with chunking', async () => {
            const result = await analyzeText(largeDoc);
            expect(result.metadata.chunk_count).toBeGreaterThan(1);
            expect(result.metadata.chunk_count).toBe(Math.ceil(250000/150000));
        });

        it('summarizeText handles large documents', async () => {
            const result = await summarizeText(largeDoc);
            expect(result.chunk_count).toBeGreaterThan(1);
        });

        it('generateText handles large documents', async () => {
            const result = await generateText(largeDoc);
            expect(result.chunk_count).toBeGreaterThan(1);
        });
    });

    describe('Metadata Requirements', () => {
        const doc = generateLargeDocument(175000);

        it('email-processing includes chunking metadata', async () => {
            const result = await processEmail(doc, { format: { type: 'email' }});
            expect(result.metadata.chunking).toBeDefined();
            expect(result.metadata.chunking.enabled).toBe(true);
            expect(result.metadata.chunking.chunk_count).toBeGreaterThan(0);
        });

        it('ofw-processing includes chunking metadata', async () => {
            const result = await processOFW(doc, { format: { type: 'email', subtype: 'ofw' }});
            expect(result.metadata.chunking).toBeDefined();
            expect(result.metadata.chunking.enabled).toBe(true);
            expect(result.metadata.chunking.chunk_count).toBeGreaterThan(0);
        });

        it('outlier-analysis includes chunking metadata', async () => {
            const result = await analyzeOutliers(doc);
            expect(result.metadata.chunking).toBeDefined();
            expect(result.metadata.chunking.enabled).toBe(true);
            expect(result.metadata.chunking.total_chunks).toBeGreaterThan(0);
        });

        it('document-processing includes chunking metadata', async () => {
            const result = await processDocument(doc);
            expect(result.metadata.chunking).toBeDefined();
            expect(result.metadata.chunking.enabled).toBe(true);
            expect(result.metadata.chunking.total_chunks).toBeGreaterThan(0);
        });

        it('document-router preserves chunking metadata', async () => {
            const result = await routeDocument(doc, 'test.eml');
            expect(result.metadata.routing.chunking).toBeDefined();
            expect(result.metadata.routing.chunking.enabled).toBe(true);
        });
    });

    describe('Processing Requirements', () => {
        const doc = generateLargeDocument(180000);

        it('maintains semantic coherence across chunks', async () => {
            const result = await analyzeText(doc);
            expect(result.semantic).toBeDefined();
            expect(result.semantic.key_points.length).toBeGreaterThan(0);
            expect(result.semantic.confidence).toBeGreaterThan(0);
        });

        it('preserves entity relationships across chunks', async () => {
            const result = await analyzeText(doc);
            expect(result.entities).toBeDefined();
            expect(result.entities.relationships).toBeDefined();
        });

        it('maintains context between chunks', async () => {
            const result = await generateText(doc);
            expect(result.text).toBeDefined();
            expect(result.chunk_count).toBeGreaterThan(1);
        });
    });

    describe('Performance Requirements', () => {
        const docs = [
            generateLargeDocument(50000),
            generateLargeDocument(150000),
            generateLargeDocument(250000)
        ];

        it('processes chunks in parallel where possible', async () => {
            const startTime = Date.now();
            const result = await analyzeText(docs[2]);
            const duration = Date.now() - startTime;
            
            // Should take less time than sequential processing
            const expectedSequentialTime = result.metadata.chunk_count * 5000; // 5s per chunk
            expect(duration).toBeLessThan(expectedSequentialTime);
        });

        it('scales processing time reasonably with document size', async () => {
            const times = [];
            
            for (const doc of docs) {
                const startTime = Date.now();
                await analyzeText(doc);
                times.push(Date.now() - startTime);
            }

            // Time should not grow exponentially
            const ratio1 = times[1] / times[0];
            const ratio2 = times[2] / times[1];
            expect(ratio2).toBeLessThan(ratio1 * 1.5);
        });
    });

    describe('Error Handling', () => {
        it('handles chunking failures gracefully', async () => {
            const invalidDoc = { toString: () => { throw new Error('Cannot convert'); }};
            await expect(analyzeText(invalidDoc)).rejects.toThrow();
        });

        it('reports chunking errors clearly', async () => {
            const invalidDoc = null;
            try {
                await analyzeText(invalidDoc);
            } catch (error) {
                expect(error.message).toMatch(/chunk|token|size/i);
            }
        });
    });
});
