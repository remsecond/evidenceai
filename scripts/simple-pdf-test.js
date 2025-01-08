import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a log file
const logFile = path.join(process.cwd(), 'test-data', 'pdf-check', 'pdf-test-log.txt');
const log = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
};

// Clear previous log
if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
}

log('=== Simple PDF.js Test ===');

async function testPDF() {
    try {
        log(`Current directory: ${process.cwd()}`);
        
        // Load PDF.js
        log('Loading PDF.js...');
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
        log('PDF.js loaded successfully');
        
        // Set up worker
        log('Setting up worker...');
        const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        log('Worker set up successfully');
        
        // Load PDF file
        const pdfPath = path.resolve(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        log(`PDF path: ${pdfPath}`);
        
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found at ${pdfPath}`);
        }
        
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        log(`PDF file read successfully, size: ${data.length} bytes`);
        
        // Try to load document
        log('Attempting to load PDF document...');
        const loadingTask = pdfjsLib.getDocument(data);
        const doc = await loadingTask.promise;
        
        log(`Success! PDF loaded with ${doc.numPages} pages`);
        
    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(`Stack trace: ${error.stack}`);
    }
}

testPDF().catch(error => {
    log(`Unhandled error: ${error.message}`);
    log(`Stack trace: ${error.stack}`);
});
