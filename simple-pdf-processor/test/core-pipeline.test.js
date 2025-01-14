import chai from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfProcessor from '../src/services/pdf-processor.js';

const { expect } = chai;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Core Pipeline', () => {
    const testFiles = [
        {
            path: path.join(__dirname, 'fixtures', 'sample-ofw.txt'),
            name: 'OFW Sample'
        },
        {
            path: path.join(__dirname, 'fixtures', 'sample-email.txt'),
            name: 'Email Sample'
        }
    ];

    testFiles.forEach(file => {
        describe(`Processing ${file.name}`, () => {
            let result;

            before(async () => {
                // Verify file exists
                if (!fs.existsSync(file.path)) {
                    throw new Error(`Test file not found: ${file.path}`);
                }
                result = await pdfProcessor.process(file.path);
                console.log(`\n${file.name} stats:`, {
                    pages: result.statistics.pages,
                    words: result.statistics.words,
                    chunks: result.statistics.chunks,
                    avg_tokens: result.statistics.average_tokens_per_chunk,
                    total_tokens: result.statistics.estimated_total_tokens,
                    time: result.processing_meta.processing_time + 'ms'
                });
            });

            it('should process PDF quickly', () => {
                expect(
                    result.processing_meta.processing_time,
                    'Processing took too long'
                ).to.be.below(2000); // Under 2 seconds
            });

            it('should extract text content', () => {
                expect(result.raw_content.text).to.be.a('string').and.not.empty;
                expect(result.statistics.words).to.be.above(50); // Test files are smaller
            });

            it('should create chunks', () => {
                expect(result.raw_content.chunks).to.be.an('array').and.not.empty;
                expect(result.raw_content.chunks[0]).to.have.property('text');
                expect(result.raw_content.chunks[0]).to.have.property('metadata');
            });

            it('should include file info', () => {
                expect(result.file_info).to.include.keys([
                    'path',
                    'size_bytes',
                    'size_mb',
                    'created',
                    'modified'
                ]);
            });

            it('should include statistics', () => {
                expect(result.statistics).to.include.keys([
                    'pages',
                    'words',
                    'chunks',
                    'estimated_total_tokens',
                    'average_tokens_per_chunk'
                ]);
            });

            it('should include processing metadata', () => {
                expect(result.processing_meta).to.include.keys([
                    'timestamp',
                    'version',
                    'processing_time'
                ]);
            });
        });
    });
});
