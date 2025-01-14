import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import odsProcessor from '../src/services/ods-processor.js';
import { getLogger } from '../src/utils/logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = getLogger();

describe('ODS Label Processing', function() {
    this.timeout(30000); // Set timeout for all tests in this suite
    let result;
    const testFile = 'C:/Users/robmo/OneDrive/Documents/evidenceai_test/input/Coquille Test/label Emails from kepinsmom@gmail.com.ods';

    before(async () => {
        // Verify file exists
        if (!fs.existsSync(testFile)) {
            throw new Error(`Test file not found: ${testFile}`);
        }
        result = await odsProcessor.process(testFile);
        logger.info('Processing complete');
        
        // Log processing stats
        logger.info('Processing stats:', {
            labels: result.statistics.labels,
            fields: result.statistics.fields,
            total_cells: result.statistics.total_cells,
            processing_time: result.processing_meta.processing_time
        });

        // Log first label for analysis
        if (result.raw_content.labels.length > 0) {
            logger.info('First label:', result.raw_content.labels[0]);
        }
    });

    it('should process ODS content and extract labels', async () => {
        // Verify basic structure
        expect(result.file_info).to.exist;
        expect(result.statistics).to.exist;
        expect(result.raw_content).to.exist;
        expect(result.processing_meta).to.exist;
        
        // Verify file info
        expect(result.file_info.path).to.equal(testFile);
        expect(result.file_info.total_rows).to.be.above(0);
        expect(result.file_info.total_columns).to.be.above(0);
        
        // Verify statistics
        expect(result.statistics.labels).to.be.above(0);
        expect(result.statistics.fields).to.be.above(0);
        expect(result.statistics.total_cells).to.be.above(0);
    });

    it('should extract valid label data', () => {
        const labels = result.raw_content.labels;
        expect(labels).to.be.an('array').that.is.not.empty;
        
        // Check first label structure
        const firstLabel = labels[0];
        expect(firstLabel).to.be.an('object');
        expect(Object.keys(firstLabel).length).to.be.above(0);
        
        // Verify headers were extracted
        expect(result.raw_content.headers).to.be.an('array').that.is.not.empty;
    });

    it('should maintain data integrity', () => {
        // Verify format metadata
        expect(result.raw_content.structure.format).to.equal('ods');
        expect(result.raw_content.structure.metadata.sheet_names).to.be.an('array');
        expect(result.raw_content.structure.metadata.active_sheet).to.be.a('string');
        
        // Verify processing metadata
        expect(result.processing_meta.timestamp).to.be.a('string');
        expect(result.processing_meta.version).to.equal('1.0');
        expect(result.processing_meta.processing_time).to.be.above(0);
    });

    it('should handle label relationships', () => {
        const labels = result.raw_content.labels;
        
        // Check for required fields in each label
        labels.forEach((label, index) => {
            expect(label, `Label ${index + 1}`).to.be.an('object');
            expect(Object.keys(label).length, `Label ${index + 1} fields`).to.be.above(0);
            
            // Verify required fields
            expect(label['Thread ID'], `Label ${index + 1} Thread ID`).to.be.a('string');
            expect(label['Message ID'], `Label ${index + 1} Message ID`).to.be.a('string');
            expect(label['From'], `Label ${index + 1} From`).to.be.a('string');
            expect(label['To'], `Label ${index + 1} To`).to.be.a('string');
            expect(label['Subject'], `Label ${index + 1} Subject`).to.be.a('string');
            expect(label['Labels'], `Label ${index + 1} Labels`).to.be.a('string');
            expect(label['RFC 822 Message ID'], `Label ${index + 1} RFC 822 Message ID`).to.be.a('string');
            
            // Verify email format
            expect(label['From']).to.match(/@/);
            expect(label['To']).to.match(/@/);
            
            // Verify label format
            expect(label['Labels']).to.include('kepinsmom@gmail.com');
            
            // Verify message structure (optional fields may be empty strings)
            expect(label['Email Text'], `Label ${index + 1} Email Text`).to.be.a('string').that.is.not.undefined;
            expect(label['Body Snippet'], `Label ${index + 1} Body Snippet`).to.be.a('string').that.is.not.undefined;
            expect(label['Is Real Reply?'], `Label ${index + 1} Is Real Reply?`).to.satisfy(val => val === 'YES' || val === 'NO' || val === '');
            expect(label['Is Auto Reply?'], `Label ${index + 1} Is Auto Reply?`).to.satisfy(val => val === 'YES' || val === 'NO' || val === '');
            
            // Verify additional metadata (optional fields may be empty strings)
            expect(label['From (name)'], `Label ${index + 1} From (name)`).to.be.a('string').that.is.not.undefined;
            expect(label['From (all info)'], `Label ${index + 1} From (all info)`).to.be.a('string').that.is.not.undefined;
            expect(label['To (name)'], `Label ${index + 1} To (name)`).to.be.a('string').that.is.not.undefined;
            expect(label['To (all info)'], `Label ${index + 1} To (all info)`).to.be.a('string').that.is.not.undefined;
        });
    });
});
