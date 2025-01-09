import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { join } from 'path';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });

// Initialize Cline context
import { execSync } from 'child_process';

// Create required directories in project folder
const inputDir = path.join(__dirname, '..', 'input');
const outputDir = path.join(__dirname, '..', 'output');
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Initialize Cline context on server start
async function initializeContext() {
    try {
        console.log('\n=== Initializing Cline Context ===\n');
        
        // Create required directories
        const contextDir = path.join(__dirname, '..', '.cline');
        const sessionLogsDir = path.join(__dirname, '..', 'session_logs');
        const demosDir = path.join(__dirname, '..', 'demos');
        
        [contextDir, sessionLogsDir, demosDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            }
        });

        // Initialize context file if it doesn't exist
        const contextPath = path.join(contextDir, 'context.json');
        if (!fs.existsSync(contextPath)) {
            const initialContext = {
                lastSession: {
                    date: new Date().toISOString(),
                    focus: 'Not set',
                    progress: 'No progress recorded'
                },
                sessions: [],
                environment: {
                    initialized: new Date().toISOString(),
                    version: '1.0.0'
                }
            };
            fs.writeFileSync(contextPath, JSON.stringify(initialContext, null, 2));
            console.log('Created initial context file');
        }

        console.log('Context initialization complete');
        return true;
    } catch (error) {
        console.error('Failed to initialize context:', error);
        console.error('Error details:', error.stack);
        return false;
    }
}

// Enable CORS for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());

// Server status and management
let serverStartTime = null;
let serverStatus = 'stopped';

// Status endpoint with detailed info
app.get('/health', (req, res) => {
    res.json({
        status: serverStatus,
        uptime: serverStartTime ? Math.floor((Date.now() - serverStartTime) / 1000) : 0,
        timestamp: new Date().toISOString()
    });
});

// File processing endpoint
app.post('/process-file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {

        // Copy uploaded file to input directory
        const inputPath = path.join(inputDir, req.file.originalname);
        fs.copyFileSync(req.file.path, inputPath);

        // Log processing details to terminal
        process.stdout.write('\n=== Processing Details ===\n');
        process.stdout.write(`Input file: ${inputPath}\n`);
        process.stdout.write(`Output directory: ${outputDir}\n`);

        // Start processing with full path
        const scriptPath = path.join(__dirname, '..', 'test-pdf-extraction.js');
        process.stdout.write(`Running script: ${scriptPath}\n\n`);
        
        const childProcess = spawn('node', [scriptPath], {
            cwd: path.join(__dirname, '..'),
            env: {
                ...process.env,
                INPUT_FILE: inputPath,
                OUTPUT_DIR: outputDir
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Log any errors
        childProcess.on('error', (err) => {
            const errorMsg = `Failed to start process: ${err.message}`;
            process.stdout.write(`ERROR: ${errorMsg}\n`);
            res.write(`${errorMsg}\n`);
        });

        childProcess.stderr.on('data', (data) => {
            const errorMsg = data.toString();
            process.stdout.write(`ERROR: ${errorMsg}`);
            res.write(`Error: ${errorMsg}`);
        });

        // Stream output to both response and terminal
        childProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
            res.write(data);
        });

        // Set response type
        res.setHeader('Content-Type', 'text/plain');

        childProcess.on('close', (code) => {
            if (code === 0) {
                res.write('\nProcessing completed successfully');
            } else {
                res.write(`\nProcessing failed with code ${code}`);
            }
            res.end();
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up uploaded file
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// Get processing results
app.get('/processing-results', (req, res) => {
    try {
        if (!fs.existsSync(outputDir)) {
            return res.status(404).json({ error: 'No output directory found' });
        }

        const files = fs.readdirSync(outputDir);
        if (files.length === 0) {
            return res.status(404).json({ error: 'No processed files found' });
        }

        const results = files.map(file => {
            const filePath = path.join(outputDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return { file, content, success: true };
            } catch (error) {
                return { 
                    file, 
                    error: `Failed to read file: ${error.message}`,
                    success: false
                };
            }
        });

        res.json({
            output_directory: outputDir,
            file_count: files.length,
            results: results
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error accessing processing results'
        });
    }
});

// Workspace status endpoint
app.get('/workspace-status', (req, res) => {
    try {
        const workspacePath = path.join(__dirname, '..', 'evidenceai.code-workspace');
        const contextPath = path.join(__dirname, '..', '.cline', 'context.json');
        
        // Check both workspace and context
        const hasWorkspace = fs.existsSync(workspacePath);
        const hasContext = fs.existsSync(contextPath);
        
        if (hasWorkspace && hasContext) {
            res.json({
                status: 'active',
                workspace: 'evidenceai',
                context: true
            });
        } else {
            res.status(404).json({
                status: 'inactive',
                workspace: hasWorkspace ? 'evidenceai' : null,
                context: hasContext
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to check workspace status' });
    }
});

// Session context endpoint
app.get('/session-context', (req, res) => {
    try {
        const contextPath = path.join(__dirname, '..', '.cline', 'context.json');
        if (!fs.existsSync(contextPath)) {
            return res.status(404).json({ error: 'Context not initialized' });
        }

        const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
        res.json({
            date: context.lastSession.date,
            focus: context.lastSession.focus,
            progress: context.lastSession.progress,
            environment: context.environment
        });
    } catch (error) {
        console.error('Session context error:', error);
        res.status(500).json({ 
            error: 'Failed to load session context',
            details: error.message,
            stack: error.stack,
            contextPath: path.join(__dirname, '..', '.cline', 'context.json')
        });
    }
});

// Initialize context and start server
const port = 3456;

// Use an immediately invoked async function to handle initialization
(async () => {
    try {
        const contextInitialized = await initializeContext();
        if (!contextInitialized) {
            console.error('\x1b[31m%s\x1b[0m', 'Failed to initialize Cline context. Server will not start.');
            process.exit(1);
        }

        serverStartTime = Date.now();
        serverStatus = 'running';

        app.listen(port, () => {
            console.log('\n=== Server Status ===\n');
            console.log('\x1b[32m%s\x1b[0m', '✓ EvidenceAI Development Server Started');
            console.log('\x1b[36m%s\x1b[0m', `Server running at http://localhost:${port}`);
            console.log('\x1b[36m%s\x1b[0m', 'Open dev_protocol.html in Edge to access Mission Control');
            console.log('\x1b[33m%s\x1b[0m', '\nKeep this window open while using Mission Control');
            console.log('\x1b[33m%s\x1b[0m', 'Server logs and status will appear below:\n');
        });
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Failed to start server:', error);
        process.exit(1);
    }
})();

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down server...');
    serverStatus = 'stopped';
    process.exit(0);
});
