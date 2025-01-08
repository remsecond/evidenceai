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

// Write to console for immediate feedback
function log(message) {
    const logMessage = `[${new Date().toISOString()}] ${message}`;
    console.error(logMessage);
}

async function checkPDF() {
    try {
        log('=== Starting PDF Check ===');
        log('Current directory: ' + process.cwd());
        log('Script location: ' + __filename);

        // Import pdf2json dynamically to catch any import errors
        log('Importing pdf2json...');
        const PDFParser = (await import('pdf2json')).default;
        log('pdf2json imported successfully');

        // Construct absolute path to PDF
        const pdfPath = path.resolve(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
        log(`Looking for PDF at: ${pdfPath}`);

        // Verify file exists
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found at ${pdfPath}`);
        }

        const stats = fs.statSync(pdfPath);
        log(`File exists with size: ${stats.size} bytes`);

        // Create parser
        log('Creating PDF parser...');
        const pdfParser = new PDFParser();
        log('Parser created');

        // Set up promise to handle parsing
        log('Setting up parse promise...');
        const parsePromise = new Promise((resolve, reject) => {
            pdfParser.on('pdfParser_dataReady', (pdfData) => {
                log('PDF parsing complete');
                resolve(pdfData);
            });

            pdfParser.on('pdfParser_dataError', (error) => {
                log(`PDF parsing error: ${error}`);
                reject(error);
            });

            // Add more event listeners for debugging
            pdfParser.on('readable', () => log('Parser readable'));
            pdfParser.on('error', (error) => log(`Parser error: ${error}`));
        });

        // Load and parse PDF
        log('Starting PDF parse...');
        const buffer = fs.readFileSync(pdfPath);
        log(`Read ${buffer.length} bytes from PDF`);
        
        log('Loading PDF into parser...');
        pdfParser.parseBuffer(buffer);

        // Wait for parsing to complete
        log('Waiting for parse to complete...');
        const pdfData = await parsePromise;
        log('Parse complete, processing results...');
        
        // Save results
        const results = {
            fileInfo: {
                path: pdfPath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            },
            pdfInfo: {
                pageCount: pdfData.Pages.length,
                metadata: pdfData.Meta,
                version: pdfData.Version
            }
        };

        // Create output directory
        const outputDir = path.join(process.cwd(), 'test-data', 'pdf-check');
        log(`Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
        
        // Save PDF info
        const infoPath = path.join(outputDir, 'pdf-info.json');
        log(`Saving PDF info to: ${infoPath}`);
        fs.writeFileSync(infoPath, JSON.stringify(results, null, 2));
        log('PDF info saved');

        // Save first page text
        if (pdfData.Pages.length > 0) {
            log('Extracting first page text...');
            const firstPageText = pdfData.Pages[0].Texts
                .map(text => decodeURIComponent(text.R[0].T))
                .join(' ');
            
            const textPath = path.join(outputDir, 'first-page.txt');
            log(`Saving first page text to: ${textPath}`);
            fs.writeFileSync(textPath, firstPageText);
            log('First page text saved');
        }

        log('PDF check complete');
        return results;

    } catch (error) {
        log('\n=== ERROR ===');
        log(`Type: ${error.constructor.name}`);
        log(`Message: ${error.message}`);
        log(`Stack: ${error.stack}`);
        throw error;
    }
}

// Run check
checkPDF()
    .then(results => {
        log('Success!');
        log(JSON.stringify(results, null, 2));
    })
    .catch(error => {
        log('Failed!');
        log(error.stack);
        process.exit(1);
    });
