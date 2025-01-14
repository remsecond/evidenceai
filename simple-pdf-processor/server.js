import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pdfProcessor from './src/services/pdf-processor.js';
import { ODSProcessor } from './src/services/ods-processor.js';

// Initialize processors
const odsProcessor = new ODSProcessor();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination directories
const sourceDir = 'C:\\Users\\robmo\\OneDrive\\Documents\\evidenceai_test\\input\\3_File_Nov_Jan_Test';
const destDir = 'C:\\Users\\robmo\\Desktop\\evidenceai\\input';

// Create Express app
const app = express();

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        source_dir: sourceDir,
        dest_dir: destDir,
        supported_formats: ['pdf', 'txt']
    });
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.oasis.opendocument.spreadsheet',
            'application/x-vnd.oasis.opendocument.spreadsheet'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed. Allowed types: PDF, TXT, ODS. Got: ${file.mimetype}`));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Process files endpoint
app.post('/process', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        console.log('Processing file:', req.file.originalname);
        const startTime = Date.now();

        // Select processor based on file extension
        const ext = path.extname(req.file.originalname).toLowerCase();
        let result;
        
        if (ext === '.pdf') {
            result = await pdfProcessor.process(req.file.path);
        } else if (ext === '.ods') {
            result = await odsProcessor.process(req.file.path);
        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }

        // Create response with enhanced data
        const response = {
            status: 'success',
            pages: result.statistics.pages || result.statistics.labels || 0,
            words: result.statistics.words || result.statistics.total_cells || 0,
            processingTime: `${((Date.now() - startTime) / 1000).toFixed(3)}s`,
            content: {
                text: result.raw_content.text ? result.raw_content.text.substring(0, 1000) + '...' : 'No text content',
                metadata: result.file_info,
                structure: result.raw_content.structure,
                statistics: result.statistics
            }
        };

        // Copy processed file to evidenceai input directory
        const destDir = 'C:\\Users\\robmo\\Desktop\\evidenceai\\input';
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const destPath = path.join(destDir, req.file.originalname);
        fs.copyFileSync(req.file.path, destPath);
        console.log(`Copied ${req.file.originalname} to ${destPath}`);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            ...response,
            destination: destPath
        });
        console.log('Processing complete');
    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const port = 3002;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
