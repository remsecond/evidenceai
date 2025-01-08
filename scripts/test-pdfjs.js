import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable detailed error stacks
Error.stackTraceLimit = Infinity;

// Add process error handlers
process.on('uncaughtException', (error) => {
    console.error('\nUncaught Exception:');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\nUnhandled Rejection:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

async function processPDF() {
    try {
        console.error('Starting PDF processing...');
        console.error('Current directory:', process.cwd());
        console.error('Script location:', __filename);

        // Initialize pdf.js
        console.error('Initializing pdf.js...');
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
        
        // Set up worker
        console.error('Setting up worker...');
        const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

        // Load the PDF file
        const pdfPath = path.resolve(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        console.error('PDF path:', pdfPath);

        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found at ${pdfPath}`);
        }

        const data = new Uint8Array(fs.readFileSync(pdfPath));
        console.error('Read', data.length, 'bytes');

        // Load PDF document
        console.error('Loading PDF document...');
        const loadingTask = pdfjsLib.getDocument(data);
        const pdfDocument = await loadingTask.promise;
        console.error('PDF loaded successfully');
        console.error('Number of pages:', pdfDocument.numPages);

        // Get the first page
        console.error('\nGetting first page...');
        const page = await pdfDocument.getPage(1);
        console.error('Page loaded');

        // Get page text content
        console.error('Extracting text content...');
        const textContent = await page.getTextContent();
        console.error('Text content extracted');

        // Create output directory
        const outputDir = path.join(process.cwd(), 'test-data', 'pdf-check');
        console.error('\nCreating output directory:', outputDir);
        fs.mkdirSync(outputDir, { recursive: true });

        // Save metadata
        const metadata = await pdfDocument.getMetadata();
        const info = {
            pageCount: pdfDocument.numPages,
            metadata: metadata,
            firstPageItems: textContent.items.length
        };

        const infoPath = path.join(outputDir, 'pdf-info.json');
        console.error('Saving PDF info to:', infoPath);
        fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));

        // Save first page text
        const text = textContent.items.map(item => item.str).join(' ');
        const textPath = path.join(outputDir, 'first-page.txt');
        console.error('Saving first page text to:', textPath);
        fs.writeFileSync(textPath, text);

        console.error('\nProcessing complete!');
        return info;

    } catch (error) {
        console.error('\nERROR:');
        console.error('Type:', error.constructor.name);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

// Run processing
console.error('=== Starting PDF Processing ===\n');
processPDF()
    .then(info => {
        console.error('\nSuccess!');
        console.error(JSON.stringify(info, null, 2));
    })
    .catch(error => {
        console.error('\nFailed!');
        console.error(error);
        process.exit(1);
    });
