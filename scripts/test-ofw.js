import fs from 'fs/promises';
import path from 'path';
import { processOFW } from '../src/services/ofw-processing.js';

// Use project relative paths
const TEST_FILE = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');

async function testOFWProcessing() {
    try {
        console.log('Starting OFW test...');
        
        // Read test file
        console.log('Reading test file:', TEST_FILE);
        const content = await fs.readFile(TEST_FILE);
        console.log('File read successfully, size:', content.length, 'bytes');
        
        // Process with default settings first
        console.log('\nTesting with default settings...');
        const result = await processOFW(content, {
            format: { type: 'email', subtype: 'ofw' },
            options: { debug: true }
        });
        
        console.log('\nProcessing Results:');
        console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
        console.log('Analysis:', JSON.stringify(result.analysis, null, 2));
        
        if (result.ofw) {
            console.log('\nOFW-specific results:');
            console.log('Custody Events:', result.ofw.custody_events?.length || 0);
            console.log('Schedule Changes:', result.ofw.schedule_changes?.length || 0);
            console.log('Communication Patterns:', JSON.stringify(result.ofw.communication_patterns, null, 2));
        }
        
        return result;
    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Run test
console.log('='.repeat(80));
console.log('Starting OFW Processing Test');
console.log('='.repeat(80));

testOFWProcessing()
    .then(result => {
        console.log('\nTest completed successfully');
    })
    .catch(error => {
        console.error('\nTest failed:', error);
        process.exit(1);
    });
