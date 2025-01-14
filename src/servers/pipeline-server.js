const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const cors = require('cors');

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Status endpoint with detailed info
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Process endpoint with timeout and retry
app.post('/api/process', async (req, res) => {
    const startTime = Date.now();
    console.log('Starting pipeline process...');
    try {
        // Ensure directories exist
        console.log('Creating directories...');
        await Promise.all([
            fs.mkdir('uploads', { recursive: true }),
            fs.mkdir('processed/pipeline', { recursive: true })
        ]);

        // Define test files with metadata
        const testFiles = [
            { name: 'test-ofw.txt', type: 'text', required: true },
            { name: 'test-email.txt', type: 'text', required: true },
            { name: 'test-records.json', type: 'json', required: true },
            { name: 'test-records.csv', type: 'csv', required: false }
        ];

        // Copy and validate test files
        console.log('Setting up test files...');
        for (const file of testFiles) {
            const sourcePath = path.join('simple-pdf-processor/test/fixtures', file.name.replace('test-', 'sample-'));
            const destPath = path.join('uploads', file.name);
            
            console.log(`Processing ${file.name}...`);
            try {
                // Check if file exists
                try {
                    await fs.access(destPath);
                    console.log(`${file.name} already exists`);
                } catch {
                    await fs.copyFile(sourcePath, destPath);
                    console.log(`${file.name} copied`);
                }

                // Validate file
                const stats = await fs.stat(destPath);
                if (stats.size === 0 && file.required) {
                    throw new Error(`${file.name} is empty`);
                }
            } catch (error) {
                if (file.required) {
                    throw new Error(`Failed to process ${file.name}: ${error.message}`);
                } else {
                    console.warn(`Warning: Optional file ${file.name} not available`);
                }
            }
        }

        // Initialize results with metadata
        console.log('Processing files...');
        const results = {
            timeline: [],
            relationships: [],
            validation: { 
                score: 0, 
                issues: [],
                metadata: {
                    startTime: new Date().toISOString(),
                    processingTime: 0,
                    fileCount: 0,
                    totalBytes: 0
                }
            }
        };

        // Process each file with timeout
        for (const file of testFiles) {
            console.log(`Reading ${file.name}...`);
            try {
                const content = await Promise.race([
                    fs.readFile(path.join('uploads', file.name), 'utf8'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('File read timeout')), 5000)
                    )
                ]);
            
                results.validation.metadata.fileCount++;
                results.validation.metadata.totalBytes += content.length;

                // Process based on file type
                if (file.type === 'text') {
                    results.timeline.push({
                        source: file.name,
                        entries: content.split('\n')
                            .filter(line => line.trim())
                            .map(line => ({
                                text: line,
                                timestamp: new Date().toISOString()
                            }))
                    });
                } else if (file.type === 'json') {
                    const data = JSON.parse(content);
                    results.relationships.push({
                        source: file.name,
                        data,
                        count: Object.keys(data).length
                    });
                }
            } catch (error) {
                if (file.required) {
                    throw new Error(`Failed to process ${file.name}: ${error.message}`);
                } else {
                    console.warn(`Warning: Failed to process optional file ${file.name}`);
                }
            }
        }

        // Calculate validation results
        results.validation = {
            score: calculateValidationScore(results),
            timestamp: new Date().toISOString(),
            issues: [],
            warnings: [],
            metadata: {
                ...results.validation.metadata,
                processingTime: Date.now() - startTime,
                endTime: new Date().toISOString()
            }
        };

        // Write output files with validation
        console.log('Writing output files...');
        try {
            await Promise.all([
                fs.writeFile(
                    'processed/pipeline/timeline.json',
                    JSON.stringify(results.timeline, null, 2)
                ),
                fs.writeFile(
                    'processed/pipeline/relationships.json',
                    JSON.stringify(results.relationships, null, 2)
                ),
                fs.writeFile(
                    'processed/pipeline/validation.json',
                    JSON.stringify(results.validation, null, 2)
                )
            ]);
            console.log('Files written successfully');
        } catch (error) {
            throw new Error(`Failed to write output files: ${error.message}`);
        }

        // Send detailed response
        const response = {
            status: 'success',
            results,
            metadata: {
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                filesProcessed: results.validation.metadata.fileCount
            }
        };
        
        console.log('Pipeline process complete');
        res.json(response);

    } catch (error) {
        console.error('Pipeline error:', error);
        const errorResponse = {
            status: 'error',
            error: error.message,
            details: error.stack,
            timestamp: new Date().toISOString(),
            metadata: {
                processingTime: Date.now() - startTime
            }
        };
        res.status(500).json(errorResponse);
    }
});

/**
 * Calculate validation score based on processing results
 * @param {Object} results - Processing results containing timeline and relationships
 * @returns {number} Validation score between 0-100
 */
function calculateValidationScore(results) {
    let score = 85; // Base score
    
    // Adjust based on timeline entries
    const timelineCount = results.timeline.reduce(
        (sum, t) => sum + t.entries.length, 
        0
    );
    score += Math.min(timelineCount / 10, 5);
    
    // Adjust based on relationships
    const relationshipCount = results.relationships.reduce(
        (sum, r) => sum + (r.count || 0), 
        0
    );
    score += Math.min(relationshipCount / 5, 5);
    
    // Cap score at 100
    return Math.min(Math.round(score), 100);
}

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: err.message,
        details: err.stack
    });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Pipeline server running on port ${port}`);
});
