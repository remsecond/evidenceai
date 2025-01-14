import { strict as assert } from 'assert';
import { getLogger } from '../src/utils/logging.js';
import pdfProcessor from '../src/services/pdf-processor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = getLogger();

describe('Coquille Email Processing', function() {
    this.timeout(30000); // Set timeout for all tests in this suite
    let result;

    it('should process email content and extract metadata', async function() {
        this.timeout(30000); // Allow up to 30 seconds for processing
        
        const testFile = path.join(__dirname, 'fixtures', 'sample-email.txt');
        logger.info('Processing file:', testFile);
        
        result = await pdfProcessor.process(testFile);
        logger.info('Processing complete');
        
        // Verify basic structure
        assert(result.file_info, 'Should include file info');
        assert(result.statistics, 'Should include statistics');
        assert(result.raw_content, 'Should include raw content');
        assert(result.processing_meta, 'Should include processing metadata');
        
        // Verify content extraction
        assert(result.raw_content.text.length > 0, 'Should extract text content');
        assert(result.raw_content.structure, 'Should include content structure');
        assert(result.raw_content.chunks, 'Should include content chunks');
        
        // Log processing stats
        logger.info('Processing stats:', {
            pages: result.statistics.pages,
            words: result.statistics.words,
            paragraphs: result.statistics.paragraphs,
            tokens: result.statistics.estimated_total_tokens,
            format: result.raw_content.structure.format,
            processing_time: result.processing_meta.processing_time
        });
    });

    it('should maintain data structure integrity', () => {
        // Verify result structure
        assert(result.file_info, 'Should include file info');
        assert(result.statistics, 'Should include statistics');
        assert(result.raw_content, 'Should include raw content');
        assert(result.processing_meta, 'Should include processing metadata');
        
        // Verify content structure
        assert(typeof result.raw_content.text === 'string', 'Raw content text should be string');
        assert(Array.isArray(result.raw_content.chunks), 'Raw content chunks should be array');
        assert.strictEqual(result.raw_content.structure.format, 'email', 'Should detect email format');
    });
});
