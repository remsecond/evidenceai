import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Write to the scripts directory since we know it exists
const logFile = path.join(__dirname, 'test-output.log');
const testFile = path.join(__dirname, 'test-file.txt');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
}

try {
    // Clear previous log
    if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
    }
    
    log('Starting file system test...');
    log(`Current directory: ${process.cwd()}`);
    log(`Script directory: ${__dirname}`);
    
    // Write test
    const testContent = 'File system test - ' + new Date().toISOString();
    fs.writeFileSync(testFile, testContent);
    log(`Successfully wrote to: ${testFile}`);
    
    // Read test
    const content = fs.readFileSync(testFile, 'utf8');
    log(`Successfully read content: ${content}`);
    
    // Clean up test file
    fs.unlinkSync(testFile);
    log('Successfully cleaned up test file');
    
    log('File system test completed successfully');
    
} catch (error) {
    log(`ERROR: ${error.message}`);
    log(`Stack: ${error.stack}`);
    process.exit(1);
}
