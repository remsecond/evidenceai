const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Forward API requests to pipeline server first
app.use('/api', async (req, res, next) => {
    // Skip forwarding for local endpoints
    if (req.path === '/open-file' || req.path === '/list-files') {
        return next();
    }

    try {
        const pipelinePort = process.env.PIPELINE_PORT || 3000;
        const url = `http://localhost:${pipelinePort}${req.url}`;
        
        console.log(`Forwarding ${req.method} ${req.url} to pipeline server`);
        
        const response = await fetch(url, {
            method: req.method,
            headers: {
                ...req.headers,
                'host': `localhost:${pipelinePort}`,
                'content-type': 'application/json'
            },
            body: ['POST', 'PUT', 'PATCH'].includes(req.method) 
                ? JSON.stringify(req.body) 
                : undefined
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
        
    } catch (error) {
        console.error('Pipeline server error:', error);
        res.status(502).json({ 
            error: 'Pipeline server error',
            details: error.message,
            url: req.url,
            method: req.method
        });
    }
});

// Serve static files from Web directory
app.use(express.static('Web'));

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Local API endpoints
app.post('/api/open-file', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', req.body.path);
        
        // Verify file exists
        await fs.access(filePath);
        
        // Open file in default application
        const command = process.platform === 'win32' 
            ? `start "" "${filePath}"`
            : `open "${filePath}"`;
        
        exec(command, (error) => {
            if (error) {
                console.error('Error opening file:', error);
                res.status(500).json({ error: error.message });
            } else {
                res.json({ status: 'success' });
            }
        });
    } catch (error) {
        console.error('File access error:', error);
        res.status(404).json({ error: 'File not found' });
    }
});

// List files endpoint
app.get('/api/list-files', async (req, res) => {
    try {
        const dir = req.query.dir || 'processed/pipeline';
        const files = await fs.readdir(path.join(__dirname, '..', dir));
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: err.message,
        details: err.stack
    });
});

// Start server
const port = process.env.WEB_PORT || 3000;
app.listen(port, () => {
    console.log(`Web server running on port ${port}`);
    console.log(`Mission Control available at: http://localhost:${port}/mission-control.html`);
});
