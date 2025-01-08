const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Input/output paths
const inputPath = path.join(__dirname, '..', 'test-data', 'OFW_Messages_Report_Dec.pdf');
const outputDir = path.join(__dirname, '..', 'test-data', 'processed');
const llmInputDir = path.join(outputDir, 'llm-input');
const rawDir = path.join(outputDir, 'raw');
const textPath = path.join(rawDir, 'extracted-text.txt');

// Create directories
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(llmInputDir, { recursive: true });
fs.mkdirSync(rawDir, { recursive: true });

// Use Adobe Acrobat to extract text
console.log('Extracting text from PDF...');
execSync(`"C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe" /n /t "${inputPath}" "${textPath}"`);

// Read the extracted text
console.log('Reading extracted text...');
const text = fs.readFileSync(textPath, 'utf8');

// Split into chunks (100KB each)
console.log('Creating chunks...');
const maxSize = 100000;
let chunks = [];
let currentChunk = '';

text.split(/\n\s*\n/).forEach(paragraph => {
    if ((currentChunk.length + paragraph.length + 2) > maxSize) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = paragraph;
    } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    }
});
if (currentChunk) chunks.push(currentChunk.trim());

// Save chunks
console.log('Saving chunks...');
chunks.forEach((chunk, i) => {
    const chunkPath = path.join(llmInputDir, `chunk-${String(i + 1).padStart(3, '0')}.txt`);
    fs.writeFileSync(chunkPath, chunk);
});

console.log('Done!');
console.log(`- Raw text saved to: ${textPath}`);
console.log(`- Created ${chunks.length} chunks in: ${llmInputDir}`);
