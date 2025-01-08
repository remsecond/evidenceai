import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Enable detailed error stacks
Error.stackTraceLimit = Infinity;

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (error) => {
    console.error('\nUncaught Exception:');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\nUnhandled Rejection:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

console.error('\n=== Environment Info ===\n');
console.error('Current directory:', process.cwd());
console.error('Script location:', __filename);
console.error('Node version:', process.version);
console.error('Platform:', process.platform);
console.error('Architecture:', process.arch);
console.error('Process ID:', process.pid);
console.error('User info:', process.env.USERNAME);
console.error('Home directory:', process.env.USERPROFILE);

console.error('\n=== File System Test ===\n');

try {
    // Test working directory access
    console.error('Working directory contents:');
    console.error(fs.readdirSync(process.cwd()));

    // Test test-data directory access
    const testDataPath = path.join(process.cwd(), 'test-data');
    console.error('\ntest-data directory contents:');
    if (fs.existsSync(testDataPath)) {
        console.error(fs.readdirSync(testDataPath));
    } else {
        console.error('test-data directory not found!');
    }

    // Test PDF file access
    const pdfPath = path.join(testDataPath, 'OFW_Messages_Report_Dec.pdf');
    console.error('\nPDF file check:');
    console.error('Path:', pdfPath);
    
    if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.error('File exists');
        console.error('Size:', stats.size, 'bytes');
        console.error('Mode:', stats.mode.toString(8));
        console.error('Created:', stats.birthtime);
        console.error('Modified:', stats.mtime);
        
        // Try to read first few bytes
        const fd = fs.openSync(pdfPath, 'r');
        const buffer = Buffer.alloc(10);
        const bytesRead = fs.readSync(fd, buffer, 0, 10, 0);
        fs.closeSync(fd);
        
        console.error('First 10 bytes:', buffer.toString('hex'));
        console.error('Bytes read:', bytesRead);
    } else {
        console.error('PDF file not found');
    }

    // Test output directory creation
    console.error('\nOutput directory test:');
    const outputDir = path.join(process.cwd(), 'test-data', 'pdf-check');
    console.error('Creating:', outputDir);
    
    fs.mkdirSync(outputDir, { recursive: true });
    console.error('Directory created/exists');

    // Test file writing
    const testFile = path.join(outputDir, 'debug-test.txt');
    console.error('Writing file:', testFile);
    fs.writeFileSync(testFile, 'Debug test content');
    console.error('File written');

    // Verify write
    if (fs.existsSync(testFile)) {
        console.error('File exists after write');
        const content = fs.readFileSync(testFile, 'utf8');
        console.error('Content:', content);
    } else {
        console.error('File not found after write!');
    }

    console.error('\nAll tests completed successfully');

} catch (error) {
    console.error('\n=== ERROR ===\n');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    process.exit(1);
}
