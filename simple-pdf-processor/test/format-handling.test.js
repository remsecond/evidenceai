import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import testProcessor from './test-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Format Handling', () => {
    describe('OFW Format', () => {
        const testFile = path.join(__dirname, 'fixtures', 'sample-ofw.txt');
        let result;

        before(async () => {
            if (!fs.existsSync(testFile)) {
                throw new Error(`Test file not found: ${testFile}`);
            }
            const text = fs.readFileSync(testFile, 'utf8');
            result = await testProcessor.processText(text);

            console.log('\nOFW Format stats:', {
                format: result.statistics.format,
                chunks: result.statistics.chunks,
                avg_tokens: result.statistics.average_tokens_per_chunk,
                total_tokens: result.statistics.estimated_total_tokens
            });

            // Log first chunk
            console.log('\nOFW First chunk:', {
                text: result.raw_content.chunks[0].text,
                metadata: result.raw_content.chunks[0].metadata
            });
        });

        it('should detect OFW format', () => {
            expect(result.statistics.format).to.equal('ofw');
        });

        it('should preserve message boundaries', () => {
            const firstChunk = result.raw_content.chunks[0];
            expect(firstChunk.text.trim()).to.match(/^Message \d+ of \d+/);
        });

        it('should have reasonable chunk sizes for test data', () => {
            const avgTokens = result.statistics.average_tokens_per_chunk;
            expect(avgTokens).to.be.approximately(50, 25); // Adjusted for test data
        });

        it('should maintain context overlap', () => {
            // Check consecutive chunks from same message
            for (let i = 1; i < result.raw_content.chunks.length; i++) {
                const chunk = result.raw_content.chunks[i];
                if (chunk.metadata.continues_from !== undefined) {
                    expect(chunk.metadata.overlap_tokens).to.be.at.least(250);
                }
            }
        });
    });

    describe('Email Format', () => {
        const testFile = path.join(__dirname, 'fixtures', 'sample-email.txt');
        let result;

        before(async () => {
            if (!fs.existsSync(testFile)) {
                throw new Error(`Test file not found: ${testFile}`);
            }
            const text = fs.readFileSync(testFile, 'utf8');
            result = await testProcessor.processText(text);

            console.log('\nEmail Format stats:', {
                format: result.statistics.format,
                chunks: result.statistics.chunks,
                avg_tokens: result.statistics.average_tokens_per_chunk,
                total_tokens: result.statistics.estimated_total_tokens
            });

            // Log first chunk
            console.log('\nEmail First chunk:', {
                text: result.raw_content.chunks[0].text,
                metadata: result.raw_content.chunks[0].metadata
            });
        });

        it('should detect email format', () => {
            expect(result.statistics.format).to.equal('email');
        });

        it('should preserve email headers', () => {
            const firstChunk = result.raw_content.chunks[0];
            expect(firstChunk.text).to.include('Subject:');
            expect(firstChunk.text).to.include('From:');
            expect(firstChunk.text).to.include('To:');
            expect(firstChunk.text).to.include('Date:');
        });

        it('should have reasonable chunk sizes for test data', () => {
            const avgTokens = result.statistics.average_tokens_per_chunk;
            expect(avgTokens).to.be.approximately(70, 30); // Adjusted for test data
        });

        it('should maintain context overlap', () => {
            // Check consecutive chunks from same email
            for (let i = 1; i < result.raw_content.chunks.length; i++) {
                const chunk = result.raw_content.chunks[i];
                if (chunk.metadata.continues_from !== undefined) {
                    expect(chunk.metadata.overlap_tokens).to.be.at.least(250);
                }
            }
        });

        it('should handle email threading', () => {
            const firstChunk = result.raw_content.chunks[0];
            expect(firstChunk.metadata).to.include.keys([
                'thread_id',
                'email_id',
                'references'
            ]);
        });
    });
});
