const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Write logs to current directory
function log(message) {
    const logMessage = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync('read-ofw.log', logMessage);
    // Also write to stderr for immediate feedback
    process.stderr.write(logMessage);
}

async function readOFW() {
    try {
        log('Starting OFW file read');
        
        // Get absolute path
        const pdfPath = path.resolve(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        log(`PDF path: ${pdfPath}`);
        
        // Check file exists
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found at ${pdfPath}`);
        }
        log('PDF file exists');
        
        // Get file stats
        const stats = fs.statSync(pdfPath);
        log(`File stats: ${JSON.stringify({
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
        }, null, 2)}`);
        
        // Create output directory
        const outputDir = path.join(process.cwd(), 'test-data', 'output');
        log(`Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
        
        // Read file in chunks
        log('Reading file in chunks');
        const readStream = fs.createReadStream(pdfPath, {
            highWaterMark: 64 * 1024 // 64KB chunks
        });
        
        let totalBytes = 0;
        let chunks = [];
        
        readStream.on('data', chunk => {
            totalBytes += chunk.length;
            chunks.push(chunk);
            log(`Read chunk: ${chunk.length} bytes (total: ${totalBytes})`);
        });
        
        await new Promise((resolve, reject) => {
            readStream.on('end', () => {
                log('Finished reading file');
                resolve();
            });
            readStream.on('error', reject);
        });
        
        // Combine chunks and save
        const fullContent = Buffer.concat(chunks);
        const outputPath = path.join(outputDir, 'full-content.bin');
        fs.writeFileSync(outputPath, fullContent);
        log(`Saved full content to: ${outputPath}`);
        
        // Save first 1KB as hex for inspection
        const hexOutput = fullContent.slice(0, 1024).toString('hex');
        fs.writeFileSync(
            path.join(outputDir, 'first-1kb.hex'),
            hexOutput
        );
        log('Saved first 1KB as hex');
        
        // Try to get text content
        const textContent = fullContent.toString('utf8', 0, 1024);
        fs.writeFileSync(
            path.join(outputDir, 'first-1kb.txt'),
            textContent
        );
        log('Saved first 1KB as text');
        
        // Save report
        const report = {
            timestamp: new Date().toISOString(),
            filePath: pdfPath,
            fileSize: stats.size,
            chunksRead: chunks.length,
            totalBytesRead: totalBytes,
            outputFiles: [
                'full-content.bin',
                'first-1kb.hex',
                'first-1kb.txt'
            ]
        };
        
        fs.writeFileSync(
            path.join(outputDir, 'read-report.json'),
            JSON.stringify(report, null, 2)
        );
        log('Saved report');
        
        return report;
    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(error.stack);
        throw error;
    }
}

// Clear previous log
if (fs.existsSync('read-ofw.log')) {
    fs.unlinkSync('read-ofw.log');
}

// Run it
log('=== Starting OFW Read ===');
readOFW()
    .then(report => {
        log('Success!');
        log(JSON.stringify(report, null, 2));
    })
    .catch(error => {
        log('Failed!');
        log(error.stack);
        process.exit(1);
    });
