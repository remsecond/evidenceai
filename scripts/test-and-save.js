const fs = require('fs');
const path = require('path');

// First, write directly to a file in current directory
fs.writeFileSync('test-output.txt', '=== Test Starting ===\n');

try {
    const testFile = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
    fs.appendFileSync('test-output.txt', `Looking for file: ${testFile}\n`);

    const exists = fs.existsSync(testFile);
    fs.appendFileSync('test-output.txt', `File exists: ${exists}\n`);

    if (exists) {
        const stats = fs.statSync(testFile);
        fs.appendFileSync('test-output.txt', `File size: ${stats.size} bytes\n`);

        const content = fs.readFileSync(testFile);
        fs.appendFileSync('test-output.txt', `Read ${content.length} bytes\n`);
        
        if (Buffer.isBuffer(content)) {
            const firstBytes = content.slice(0, 20).toString('hex');
            fs.appendFileSync('test-output.txt', `First 20 bytes: ${firstBytes}\n`);
            
            const isPDF = content.slice(0, 4).toString() === '%PDF';
            fs.appendFileSync('test-output.txt', `Is valid PDF: ${isPDF}\n`);
        }
    }

    fs.appendFileSync('test-output.txt', '=== Test Complete ===\n');

} catch (error) {
    fs.appendFileSync('test-output.txt', `ERROR: ${error.message}\n${error.stack}\n`);
}

// Now read back the results
const results = fs.readFileSync('test-output.txt', 'utf8');
console.log(results);
