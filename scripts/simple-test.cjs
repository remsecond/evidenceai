const fs = require('fs');
const path = require('path');

// Write to test-data directory instead
const testDataDir = path.join(__dirname, '..', 'test-data');
const testFile = path.join(testDataDir, 'test-output.txt');

try {
    // Log the paths we're using
    fs.writeFileSync(path.join(testDataDir, 'debug-paths.txt'),
        `Script directory: ${__dirname}\n` +
        `Test data directory: ${testDataDir}\n` +
        `Test file path: ${testFile}\n`
    );
    
    // Write test file
    fs.writeFileSync(testFile, 'Hello from Node.js! ' + new Date().toISOString());
    
    // Read it back
    const content = fs.readFileSync(testFile, 'utf8');
    
    // Write results
    fs.writeFileSync(path.join(testDataDir, 'test-results.txt'),
        `Test completed at ${new Date().toISOString()}\n` +
        `Successfully wrote and read file\n` +
        `Content: ${content}\n`
    );
    
} catch (error) {
    // Write error to a file
    fs.writeFileSync(path.join(testDataDir, 'test-error.txt'),
        `Error occurred at ${new Date().toISOString()}\n` +
        `Message: ${error.message}\n` +
        `Stack: ${error.stack}\n`
    );
}
