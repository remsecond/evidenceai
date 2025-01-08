const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// First, install pdf-parse
try {
    execSync('npm install pdf-parse', { stdio: 'inherit' });
} catch (error) {
    console.error('Failed to install pdf-parse:', error);
    process.exit(1);
}

const pdfParse = require('pdf-parse');

// Simple function to chunk text
function chunkText(text, maxChunkSize = 100000) {
    const chunks = [];
    let currentChunk = '';
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
        if ((currentChunk.length + paragraph.length) > maxChunkSize) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = paragraph;
        } else {
            currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
        }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

// Process OFW file
async function processOFWNow() {
    try {
        // Read the PDF
        const pdfPath = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        const pdfBuffer = fs.readFileSync(pdfPath);
        
        // Parse PDF to text
        console.log('Parsing PDF...');
        const data = await pdfParse(pdfBuffer);
        console.log('PDF parsed successfully');
        console.log('Text length:', data.text.length);
        
        // Create results directory
        const resultsDir = path.join(process.cwd(), 'test-data', 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        // Save extracted text
        console.log('Saving extracted text...');
        fs.writeFileSync(
            path.join(resultsDir, 'extracted-text.txt'),
            data.text
        );
        
        // Basic chunking
        console.log('Chunking text...');
        const chunks = chunkText(data.text);
        console.log('Created', chunks.length, 'chunks');
        
        // Save chunks
        console.log('Saving chunks...');
        chunks.forEach((chunk, index) => {
            fs.writeFileSync(
                path.join(resultsDir, `chunk-${index + 1}.txt`),
                chunk
            );
        });
        
        // Save processing report
        const report = {
            timestamp: new Date().toISOString(),
            pdfInfo: {
                pageCount: data.numpages,
                version: data.info.PDFFormatVersion,
                metadata: data.metadata,
                textLength: data.text.length
            },
            processing: {
                chunkCount: chunks.length,
                chunks: chunks.map((chunk, index) => ({
                    index: index + 1,
                    size: chunk.length,
                    preview: chunk.slice(0, 100) + '...'
                }))
            }
        };
        
        console.log('Saving report...');
        fs.writeFileSync(
            path.join(resultsDir, 'processing-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log('Processing complete!');
        return report;
    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync(
            path.join(process.cwd(), 'test-data', 'error.log'),
            `${error.message}\n${error.stack}`
        );
        throw error;
    }
}

// Run it
console.log('Starting OFW processing...');
processOFWNow()
    .then(report => {
        console.log('Success! Report:', JSON.stringify(report, null, 2));
        fs.writeFileSync(
            path.join(process.cwd(), 'test-data', 'success.log'),
            JSON.stringify(report, null, 2)
        );
    })
    .catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
