const fs = require('fs');
const path = require('path');

// Write directly to a log file
const logFile = path.join(process.cwd(), 'debug.log');

function log(message) {
    fs.appendFileSync(logFile, message + '\n');
}

log('=== Test Starting ===');
log('Time: ' + new Date().toISOString());
log('CWD: ' + process.cwd());

const testFile = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
log('Looking for file: ' + testFile);

try {
    const stats = fs.statSync(testFile);
    log('File exists with size: ' + stats.size);
    
    const content = fs.readFileSync(testFile);
    log('Successfully read file');
    log('Content length: ' + content.length);
    log('First 100 bytes: ' + content.slice(0, 100));
    
} catch (error) {
    log('ERROR: ' + error.message);
    log('Stack: ' + error.stack);
}

log('=== Test Complete ===');
