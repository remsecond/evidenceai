const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist');

// Disable worker to run in Node environment
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

async function testPdfRead() {
    try {
        const inputPath = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        
        // Check if file exists
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }
        console.log(`Found input file: ${inputPath}`);
        
        // Read file
        console.log('Reading PDF file...');
        const data = fs.readFileSync(inputPath);
        console.log(`Read ${data.length} bytes`);
        
        // Load PDF
        console.log('Loading PDF document...');
        const loadingTask = pdfjsLib.getDocument(new Uint8Array(data));
        const pdf = await loadingTask.promise;
        console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
        
        // Try reading first page
        console.log('Reading first page...');
        const page = await pdf.getPage(1);
        const content = await page.getTextContent();
        const text = content.items
            .map(item => item.str)
            .join(' ');
        
        console.log('\nFirst page text sample:');
        console.log(text.substring(0, 500) + '...');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testPdfRead();
