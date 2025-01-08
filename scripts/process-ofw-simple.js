const fs = require('fs');
const path = require('path');

// Write log to current directory for visibility
function log(message) {
    const logMessage = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync('ofw-processing.log', logMessage);
}

// Process OFW file
async function processOFW() {
    try {
        log('Starting OFW processing');
        
        // Check if PDF exists
        const pdfPath = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        log(`Looking for PDF at: ${pdfPath}`);
        
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found at ${pdfPath}`);
        }
        
        // Read PDF file
        log('Reading PDF file');
        const pdfContent = fs.readFileSync(pdfPath);
        log(`Read ${pdfContent.length} bytes`);
        
        // Create results directory
        const resultsDir = path.join(process.cwd(), 'test-data', 'results');
        log(`Creating results directory: ${resultsDir}`);
        fs.mkdirSync(resultsDir, { recursive: true });
        
        // Save raw content for inspection
        const rawPath = path.join(resultsDir, 'raw.bin');
        log(`Saving raw content to: ${rawPath}`);
        fs.writeFileSync(rawPath, pdfContent);
        
        // Try to extract text (first few bytes)
        log('Analyzing content');
        const firstBytes = pdfContent.slice(0, 50);
        log(`First 50 bytes: ${firstBytes.toString('hex')}`);
        
        // Save a simple report
        const report = {
            timestamp: new Date().toISOString(),
            fileSize: pdfContent.length,
            filePath: pdfPath,
            firstBytesHex: firstBytes.toString('hex'),
            firstBytesText: firstBytes.toString()
        };
        
        const reportPath = path.join(resultsDir, 'simple-report.json');
        log(`Saving report to: ${reportPath}`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        log('Processing complete');
        return report;
        
    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(error.stack);
        throw error;
    }
}

// Clear previous log
if (fs.existsSync('ofw-processing.log')) {
    fs.unlinkSync('ofw-processing.log');
}

// Run it
log('=== Starting OFW Processing ===');
processOFW()
    .then(report => {
        log('Success!');
        log(JSON.stringify(report, null, 2));
    })
    .catch(error => {
        log('Failed!');
        log(error.stack);
        process.exit(1);
    });
