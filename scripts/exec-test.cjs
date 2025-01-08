const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to run a command and log its output
function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            const result = {
                command,
                stdout: stdout || '',
                stderr: stderr || '',
                error: error ? `${error.name}: ${error.message}` : null
            };
            
            // Write result to file
            fs.writeFileSync(
                path.join(__dirname, '..', 'test-data', 'command-output.txt'),
                JSON.stringify(result, null, 2)
            );
            
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

// Test Node version and environment
runCommand('node --version && echo Current directory: %CD%')
    .then(() => {
        // Try to write a test file
        const testFile = path.join(__dirname, '..', 'test-data', 'exec-test.txt');
        fs.writeFileSync(testFile, 'Test file created by exec-test.cjs');
        
        // Try to read it back
        const content = fs.readFileSync(testFile, 'utf8');
        
        // Log success
        fs.appendFileSync(
            path.join(__dirname, '..', 'test-data', 'command-output.txt'),
            '\n\nFile operations successful:\n' +
            `Created and read file: ${testFile}\n` +
            `Content: ${content}\n`
        );
    })
    .catch(error => {
        // Log error
        fs.writeFileSync(
            path.join(__dirname, '..', 'test-data', 'exec-error.txt'),
            `Error: ${error.message}\nStack: ${error.stack}`
        );
    });
