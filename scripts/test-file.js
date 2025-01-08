// Using CommonJS since we're having issues with ES modules
const fs = require('fs');
const path = require('path');

console.error('=== File System Test ===');

try {
    // Log current state
    console.error('Current working directory:', process.cwd());
    console.error('Script location:', __filename);
    console.error('Node version:', process.version);
    console.error('\n=== File Access Test ===\n');

    // Test PDF file access
    const pdfPath = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
    console.error('Testing PDF access at:', pdfPath);
    
    if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.error('PDF file found!');
        console.error('Size:', stats.size, 'bytes');
        console.error('Permissions:', stats.mode.toString(8));
        
        // Try to read some content
        const content = fs.readFileSync(pdfPath);
        console.error('Successfully read', content.length, 'bytes');
    } else {
        console.error('PDF file not found!');
        console.error('Directory contents:');
        const dir = path.dirname(pdfPath);
        if (fs.existsSync(dir)) {
            console.error(fs.readdirSync(dir));
        } else {
            console.error('Directory does not exist:', dir);
        }
    }

    console.error('\n=== Output Directory Test ===\n');

    // Test output directory creation
    const outputDir = path.join(process.cwd(), 'test-data', 'pdf-check');
    console.error('Creating directory:', outputDir);
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.error('Directory created');
    } else {
        console.error('Directory already exists');
    }

    // Test file writing
    const testFile = path.join(outputDir, 'test.txt');
    console.error('Writing test file:', testFile);
    fs.writeFileSync(testFile, 'Test content');
    console.error('File written successfully');

    // Verify file was written
    if (fs.existsSync(testFile)) {
        const content = fs.readFileSync(testFile, 'utf8');
        console.error('File content:', content);
    } else {
        console.error('Failed to verify file was written!');
    }

} catch (error) {
    console.error('\n=== ERROR ===\n');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
