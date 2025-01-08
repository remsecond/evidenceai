const fs = require('fs');
const path = require('path');

// Write directly to Desktop for visibility
const logFile = path.join(process.env.USERPROFILE, 'Desktop', 'pdf-test.log');

function log(message) {
    const entry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logFile, entry);
}

try {
    log('=== Starting Test ===');
    log(`Current directory: ${process.cwd()}`);
    log(`Node version: ${process.version}`);
    log(`Log file location: ${logFile}`);

    // Test PDF access
    const pdfPath = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
    log(`\nChecking PDF at: ${pdfPath}`);
    
    if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        log('PDF file exists');
        log(`Size: ${stats.size} bytes`);
        log(`Permissions: ${stats.mode.toString(8)}`);
        
        // Try to read content
        const content = fs.readFileSync(pdfPath);
        log(`Read ${content.length} bytes successfully`);
        
        // Try to write to Desktop
        const desktopFile = path.join(process.env.USERPROFILE, 'Desktop', 'pdf-content.bin');
        fs.writeFileSync(desktopFile, content);
        log(`Wrote content to ${desktopFile}`);
    } else {
        log('PDF file not found');
        const dir = path.dirname(pdfPath);
        if (fs.existsSync(dir)) {
            log('Directory contents:');
            log(JSON.stringify(fs.readdirSync(dir), null, 2));
        } else {
            log(`Directory does not exist: ${dir}`);
        }
    }

    log('\nTest completed successfully');

} catch (error) {
    log('\n=== ERROR ===');
    log(`Type: ${error.constructor.name}`);
    log(`Message: ${error.message}`);
    log(`Code: ${error.code}`);
    log(`Stack: ${error.stack}`);
    process.exit(1);
}
