const fs = require('fs');
const path = require('path');

// Write to test-data directory which we know exists
const logFile = path.join(process.cwd(), 'test-data', 'debug.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (error) {
        // If append fails, try to write new file
        fs.writeFileSync(logFile, logMessage);
    }
}

// Start fresh log file
try {
    fs.unlinkSync(logFile);
} catch (error) {
    // Ignore if file doesn't exist
}

log('=== Test Starting ===');
log('CWD: ' + process.cwd());

const testFile = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
log('Looking for file: ' + testFile);

try {
    const exists = fs.existsSync(testFile);
    log('File exists check: ' + exists);
    
    if (exists) {
        const stats = fs.statSync(testFile);
        log('File stats: ' + JSON.stringify({
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
        }, null, 2));
        
        const content = fs.readFileSync(testFile);
        log('File read successfully');
        log('Content length: ' + content.length);
        log('Content type: ' + typeof content);
        if (Buffer.isBuffer(content)) {
            log('Content is Buffer');
            log('First 100 bytes (hex): ' + content.slice(0, 100).toString('hex'));
        } else {
            log('First 100 chars: ' + content.slice(0, 100));
        }
    }
} catch (error) {
    log('ERROR: ' + error.message);
    log('Stack: ' + error.stack);
}

log('=== Test Complete ===');
