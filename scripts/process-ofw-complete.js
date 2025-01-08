const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Function to extract text from PDF using pdftotext
async function extractPdfText(pdfPath) {
    try {
        console.log('Reading PDF file...');
        
        // Create a temporary output file
        const txtPath = pdfPath.replace('.pdf', '.txt');
        
        // Use pdftotext command line tool
        console.log('Converting PDF to text...');
        await exec(`pdftotext "${pdfPath}" "${txtPath}"`);
        
        // Read the text file
        const text = await fsPromises.readFile(txtPath, 'utf8');
        
        // Clean up
        await fsPromises.unlink(txtPath);
        
        // Split into pages (assuming double newlines separate pages)
        const pages = text.split(/\n\n\n+/).map(page => page.trim()).filter(Boolean);
        
        return pages.map((text, index) => ({
            page: index + 1,
            text: text
        }));
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        if (error.message.includes('pdftotext')) {
            console.error('Please install poppler-utils (pdftotext) to process PDFs');
        }
        throw error;
    }
}

// Function to chunk text while preserving context
function chunkText(text, maxChunkSize = 100000) {
    const chunks = [];
    let currentChunk = '';
    
    // Split into paragraphs while preserving meaningful breaks
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    for (const paragraph of paragraphs) {
        // If adding this paragraph would exceed chunk size
        if ((currentChunk.length + paragraph.length + 2) > maxChunkSize) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = paragraph;
        } else {
            currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
        }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

async function processOFW() {
    try {
        console.log('Starting OFW processing...');
        console.log('Current working directory:', process.cwd());
        // Input/output paths
        const inputPath = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        const outputBaseDir = path.join(process.cwd(), 'test-data', 'processed');
        const llmInputDir = path.join(outputBaseDir, 'llm-input');
        const rawDir = path.join(outputBaseDir, 'raw');
        
        // First check if input file exists
        console.log('Checking input file:', inputPath);
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }
        const stats = fs.statSync(inputPath);
        console.log(`Found input file (${stats.size} bytes)`);

        // Ensure directories exist
        await fsPromises.mkdir(outputBaseDir, { recursive: true });
        await fsPromises.mkdir(llmInputDir, { recursive: true });
        await fsPromises.mkdir(rawDir, { recursive: true });
        console.log('Created output directories');

        // Extract text from PDF
        console.log('Starting PDF text extraction...');
        const extractedPages = await extractPdfText(inputPath);
        console.log(`Extracted text from ${extractedPages.length} pages`);
        
        // Combine all pages into one text
        const fullText = extractedPages
            .map(page => page.text)
            .join('\n\n');
            
        // Save raw extracted text
        await fsPromises.writeFile(
            path.join(rawDir, 'extracted-text.txt'),
            fullText
        );
        
        // Chunk the text for LLM processing
        const chunks = chunkText(fullText);
        
        // Save chunks for LLM processing
        await Promise.all(chunks.map((chunk, index) => 
            fsPromises.writeFile(
                path.join(llmInputDir, `chunk-${String(index + 1).padStart(3, '0')}.txt`),
                chunk
            )
        ));
        
        // Generate and save processing report
        const report = {
            timestamp: new Date().toISOString(),
            inputFile: inputPath,
            originalPages: extractedPages.length,
            totalTextLength: fullText.length,
            chunks: chunks.map((chunk, index) => ({
                index: index + 1,
                filename: `chunk-${String(index + 1).padStart(3, '0')}.txt`,
                size: chunk.length,
                firstLine: chunk.split('\n')[0]
            }))
        };
        
        await fsPromises.writeFile(
            path.join(outputBaseDir, 'processing-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log('Processing completed successfully');
        console.log(`- Input file: ${inputPath}`);
        console.log(`- Output directory: ${outputBaseDir}`);
        console.log(`- Created ${chunks.length} chunks for LLM processing`);
        console.log(`- Full report saved to ${path.join(outputBaseDir, 'processing-report.json')}`);
        
        return report;
    } catch (error) {
        console.error('Processing failed with error:', error);
        console.error('Error stack:', error.stack);
        if (error.code) console.error('Error code:', error.code);
        throw error;
    }
}

// Export for module usage
module.exports = processOFW;

// Run directly if called as script
if (require.main === module) {
    processOFW().catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
}
