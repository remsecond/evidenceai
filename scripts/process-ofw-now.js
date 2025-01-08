const fs = require('fs');
const path = require('path');

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
        const pdfContent = fs.readFileSync(pdfPath);
        
        // Create results directory
        const resultsDir = path.join(process.cwd(), 'test-data', 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        // Save raw content
        fs.writeFileSync(
            path.join(resultsDir, 'raw-content.txt'),
            pdfContent
        );
        
        // Basic chunking
        const chunks = chunkText(pdfContent.toString());
        
        // Save chunks
        chunks.forEach((chunk, index) => {
            fs.writeFileSync(
                path.join(resultsDir, `chunk-${index + 1}.txt`),
                chunk
            );
        });
        
        // Save processing report
        const report = {
            timestamp: new Date().toISOString(),
            originalSize: pdfContent.length,
            chunkCount: chunks.length,
            chunks: chunks.map((chunk, index) => ({
                index: index + 1,
                size: chunk.length
            }))
        };
        
        fs.writeFileSync(
            path.join(resultsDir, 'processing-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        return report;
    } catch (error) {
        fs.writeFileSync(
            path.join(process.cwd(), 'test-data', 'error.log'),
            `${error.message}\n${error.stack}`
        );
        throw error;
    }
}

// Run it
processOFWNow()
    .then(report => {
        fs.writeFileSync(
            path.join(process.cwd(), 'test-data', 'success.log'),
            JSON.stringify(report, null, 2)
        );
    })
    .catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
