import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testPipeline() {
    try {
        // Create test form data
        const form = new FormData();
        const testPdfPath = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        form.append('file', fs.createReadStream(testPdfPath));

        // Send request to pipeline server
        console.log('Sending test request to pipeline server...');
        const response = await fetch('http://localhost:3002/process', {
            method: 'POST',
            body: form
        });

        // Log response
        const result = await response.json();
        console.log('Pipeline server response:', result);
    } catch (error) {
        console.error('Error testing pipeline:', error);
    }
}

testPipeline();
