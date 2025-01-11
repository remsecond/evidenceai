import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { join } from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Enable CORS for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

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

// Workspace status endpoint
app.get('/workspace-status', (req, res) => {
    try {
        // Check if VS Code is running with our workspace
        const vscodePath = join(__dirname, '..', '.vscode');
        const workspacePath = join(__dirname, '..', 'evidenceai.code-workspace');
        
        if (fs.existsSync(vscodePath) && fs.existsSync(workspacePath)) {
            res.status(200).send('Workspace active');
        } else {
            res.status(404).send('Workspace not detected');
        }
    } catch (error) {
        res.status(500).send('Error checking workspace status');
    }
});

// Server management endpoints
app.post('/server/start', (req, res) => {
    if (serverStatus === 'running') {
        res.json({ status: 'already_running', message: 'Server is already running' });
        return;
    }

    serverStartTime = Date.now();
    serverStatus = 'running';
    res.json({ 
        status: 'started',
        message: 'Server started successfully',
        startTime: new Date().toISOString()
    });
});

app.post('/server/stop', (req, res) => {
    if (serverStatus === 'stopped') {
        res.json({ status: 'already_stopped', message: 'Server is already stopped' });
        return;
    }

    serverStartTime = null;
    serverStatus = 'stopped';
    res.json({ 
        status: 'stopped',
        message: 'Server stopped successfully'
    });
});

// Development control endpoints
app.post('/start-dev', (req, res) => {
    const devBat = join(__dirname, '..', 'dev.bat');
    try {
        spawn('cmd.exe', ['/c', devBat], {
            detached: true,
            stdio: 'ignore'
        }).unref();
        res.status(200).send('Development started');
    } catch (error) {
        res.status(500).send('Failed to start development');
    }
});

app.post('/stop-dev', (req, res) => {
    const devBat = join(__dirname, '..', 'dev.bat');
    try {
        spawn('cmd.exe', ['/c', devBat, 'stop'], {
            detached: true,
            stdio: 'ignore'
        }).unref();
        res.status(200).send('Development stopped');
    } catch (error) {
        res.status(500).send('Failed to stop development');
    }
});

// Test execution endpoint
app.post('/run-test', (req, res) => {
    const testType = req.query.type;
    let testScript;
    
    switch(testType) {
        case 'pdf-extraction':
            testScript = '../test-pdf-extraction.js';
            break;
        default:
            return res.status(400).send('Unknown test type');
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Spawn test process
    const test = spawn('node', [path.join(__dirname, testScript)], {
        cwd: path.join(__dirname, '..')
    });

    // Stream output
    test.stdout.on('data', (data) => {
        res.write(data);
    });

    test.stderr.on('data', (data) => {
        res.write(`Error: ${data}`);
    });

    // End response when test completes
    test.on('close', (code) => {
        if (code === 0) {
            res.write('\nTest completed successfully');
        } else {
            res.write(`\nTest failed with code ${code}`);
        }
        res.end();
    });
});

// Session context endpoints
app.get('/session-context', (req, res) => {
    try {
        const contextPath = join(__dirname, '..', '.cline', 'context.json');
        if (fs.existsSync(contextPath)) {
            const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
            res.json({
                date: context.lastSession?.date || 'No previous session',
                focus: context.lastSession?.focus || 'Not set',
                progress: context.lastSession?.progress || 'No progress recorded'
            });
        } else {
            res.json({
                date: 'No session data',
                focus: 'Not set',
                progress: 'No progress recorded'
            });
        }
    } catch (error) {
        res.status(500).send('Error loading session context');
    }
});

// Initialize context on server start
function initializeContext() {
    const contextDir = join(__dirname, '..', '.cline');
    const contextPath = join(contextDir, 'context.json');
    
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }
    
    if (!fs.existsSync(contextPath)) {
        const initialContext = {
            lastSession: {
                date: new Date().toISOString(),
                focus: 'Not set',
                progress: 'No progress recorded'
            },
            sessions: []
        };
        fs.writeFileSync(contextPath, JSON.stringify(initialContext, null, 2));
    }
}

// Focus area management
app.post('/set-focus', express.json(), (req, res) => {
    try {
        const { focus, details } = req.body;
        const contextDir = join(__dirname, '..', '.cline');
        const contextPath = join(contextDir, 'context.json');
        
        // Ensure context directory exists
        if (!fs.existsSync(contextDir)) {
            fs.mkdirSync(contextDir, { recursive: true });
        }

        // Load or initialize context
        let context = { sessions: [] };
        if (fs.existsSync(contextPath)) {
            context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
        }

        // Create new session entry
        const session = {
            date: new Date().toISOString(),
            focus,
            focusDetails: details,
            progress: 'In progress',
            updates: [{
                timestamp: new Date().toISOString(),
                type: 'focus_set',
                details: `Focus set to: ${focus}`
            }]
        };

        // Update context
        context.lastSession = session;
        context.sessions.unshift(session);

        // Keep only last 10 sessions
        if (context.sessions.length > 10) {
            context.sessions = context.sessions.slice(0, 10);
        }

        fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
        
        // Send back updated session info
        res.json({
            status: 'success',
            session: {
                date: session.date,
                focus: session.focus,
                progress: session.progress
            }
        });

        // Log to server console
        console.log('\x1b[36m%s\x1b[0m', `Focus updated: ${focus}`);
    } catch (error) {
        res.status(500).send('Error setting focus');
    }
});

// Initialize server state and context
serverStartTime = Date.now();
serverStatus = 'running';
initializeContext();

// Start server
const port = 3456;
app.listen(port, () => {
    console.log('\x1b[32m%s\x1b[0m', '✓ EvidenceAI Development Server Started');
    console.log('\x1b[36m%s\x1b[0m', `Server running at http://localhost:${port}`);
    console.log('\x1b[36m%s\x1b[0m', 'Open dev_protocol.html in Edge to access Mission Control');
    console.log('\x1b[33m%s\x1b[0m', '\nKeep this window open while using Mission Control');
    console.log('\x1b[33m%s\x1b[0m', 'Server logs and status will appear below:\n');
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down server...');
    serverStatus = 'stopped';
    process.exit(0);
});
