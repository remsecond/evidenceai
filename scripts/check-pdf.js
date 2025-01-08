const { execSync } = require('child_process');
const path = require('path');

try {
    // Get absolute path to PDF
    const pdfPath = path.resolve(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
    console.log('PDF path:', pdfPath);

    // Run dir command to check file
    const result = execSync(`dir "${pdfPath}"`, { encoding: 'utf8' });
    console.log('\nDirectory listing:');
    console.log(result);

    // Try to read first few bytes
    const head = execSync(`powershell -Command "Get-Content -Path '${pdfPath}' -Encoding Byte -TotalCount 100 | ForEach-Object { $_.ToString('X2') }"`, { encoding: 'utf8' });
    console.log('\nFirst 100 bytes (hex):');
    console.log(head);

} catch (error) {
    console.error('Error:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    process.exit(1);
}
