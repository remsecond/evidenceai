const { execSync } = require('child_process');
const path = require('path');

try {
    // Run test script and capture output
    const output = execSync('node scripts/test-pdf.js', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // Write output to a file
    const fs = require('fs');
    fs.writeFileSync('test-results.txt', output);
    
    // Also print to console
    console.log('=== Test Output ===');
    console.log(output);
    console.log('=== End Output ===');
    
} catch (error) {
    console.error('Error running test:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    process.exit(1);
}
