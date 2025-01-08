import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.error('Starting simple check...');
console.error('Current directory:', process.cwd());
console.error('Script directory:', __dirname);

try {
    // Try both relative and absolute paths
    const paths = [
        path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf'),
        path.resolve(__dirname, '..', 'test-data', 'OFW_Messages_Report_Dec.pdf')
    ];

    paths.forEach((pdfPath, index) => {
        console.error(`\nTrying path ${index + 1}: ${pdfPath}`);
        
        if (fs.existsSync(pdfPath)) {
            const stats = fs.statSync(pdfPath);
            console.error('File exists!');
            console.error('File size:', stats.size, 'bytes');
            console.error('Created:', stats.birthtime);
            console.error('Modified:', stats.mtime);
            
            // Try to read first few bytes
            const fd = fs.openSync(pdfPath, 'r');
            const buffer = Buffer.alloc(5);
            const bytesRead = fs.readSync(fd, buffer, 0, 5, 0);
            fs.closeSync(fd);
            
            console.error('First 5 bytes:', buffer.toString('hex'));
            console.error('Bytes read:', bytesRead);
        } else {
            console.error('File not found at this path');
        }
    });

    // Try to create output directory
    const outputDir = path.join(process.cwd(), 'test-data', 'pdf-check');
    console.error('\nTrying to create output directory:', outputDir);
    fs.mkdirSync(outputDir, { recursive: true });
    console.error('Output directory created/exists');

    // Try to write a test file
    const testFile = path.join(outputDir, 'test.txt');
    console.error('Trying to write test file:', testFile);
    fs.writeFileSync(testFile, 'Test file');
    console.error('Test file written successfully');

} catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
}
