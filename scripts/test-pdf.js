const fs = require('fs');
const path = require('path');

async function testPDF() {
    try {
        const testFile = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        process.stdout.write(`Looking for file: ${testFile}\n`);

        // Check file exists
        if (!fs.existsSync(testFile)) {
            process.stderr.write('ERROR: File does not exist!\n');
            process.exit(1);
        }
        process.stdout.write('File exists\n');

        // Get file stats
        const stats = fs.statSync(testFile);
        process.stdout.write(`File size: ${stats.size} bytes\n`);

        // Read file content
        process.stdout.write('Reading file...\n');
        const content = fs.readFileSync(testFile);
        process.stdout.write(`Read ${content.length} bytes\n`);
        process.stdout.write(`Content is ${Buffer.isBuffer(content) ? 'Buffer' : typeof content}\n`);
        
        // Show first few bytes
        if (Buffer.isBuffer(content)) {
            process.stdout.write(`First 20 bytes (hex): ${content.slice(0, 20).toString('hex')}\n`);
            // Check if it's a PDF (should start with %PDF)
            const isPDF = content.slice(0, 4).toString() === '%PDF';
            process.stdout.write(`File ${isPDF ? 'is' : 'is NOT'} a valid PDF\n`);
        }

        process.stdout.write('Test completed successfully\n');
        process.exit(0);
    } catch (error) {
        process.stderr.write(`ERROR: ${error.message}\n`);
        process.stderr.write(error.stack + '\n');
        process.exit(1);
    }
}

// Run test
process.stdout.write('=== Starting PDF Test ===\n');
testPDF();
