const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.static('Web'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Web/mission-control.html'));
});

// API endpoints
app.post('/api/process', async (req, res) => {
    try {
        // Trigger pipeline processing
        const result = await triggerPipeline();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prepare-llm', async (req, res) => {
    try {
        // Create required directories
        await fs.mkdir('processed/chatgpt-input', { recursive: true });
        await fs.mkdir('processed/analysis', { recursive: true });

        // Prepare input files from pipeline output
        const files = [
            {
                name: '1-timeline.json',
                source: 'processed/pipeline/timeline.json'
            },
            {
                name: '2-relationships.json',
                source: 'processed/pipeline/relationships.json'
            },
            {
                name: '3-validation.json',
                source: 'processed/pipeline/validation.json'
            }
        ];

        // Copy and format files
        for (const file of files) {
            const content = await fs.readFile(file.source, 'utf8');
            await fs.writeFile(
                path.join('processed/chatgpt-input', file.name),
                JSON.stringify(JSON.parse(content), null, 2)
            );
        }

        // Create analysis templates
        const templates = {
            'evidence-report.md': `---
date: ${new Date().toISOString()}
source_files: 3
analysis_type: comprehensive
model: gpt-4
---

[Paste ChatGPT's complete analysis here]`,
            'findings.json': JSON.stringify({
                timeline: [],
                participants: [],
                patterns: [],
                gaps: []
            }, null, 2),
            'review-notes.md': `# Analysis Review Notes

## Completeness Check
- [ ] Timeline fully analyzed
- [ ] Relationships mapped
- [ ] Validation reviewed

## Quality Check
- [ ] Confidence scores assessed
- [ ] Issues documented
- [ ] Recommendations provided

## Follow-up Items
1. [Investigation needs]
2. [Validation requirements]
3. [Risk mitigations]`
        };

        // Write templates
        for (const [name, content] of Object.entries(templates)) {
            await fs.writeFile(
                path.join('processed/analysis', name),
                content
            );
        }

        // Generate README with instructions
        const template = await fs.readFile('docs/README_TEMPLATE.md', 'utf8');
        const readme = template.replace('{date}', new Date().toISOString());
        await fs.writeFile(
            path.join('processed/chatgpt-input', 'README.md'),
            readme
        );

        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/open-file', (req, res) => {
    const filePath = path.join(__dirname, '..', req.body.path);
    
    // Open file in default application
    const command = process.platform === 'win32' 
        ? `start "" "${filePath}"`
        : `open "${filePath}"`;
    
    exec(command, (error) => {
        if (error) {
            res.status(500).json({ error: error.message });
        } else {
            res.json({ status: 'success' });
        }
    });
});

// Helper functions
async function triggerPipeline() {
    // Pipeline processing logic here
    return { status: 'processing' };
}

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Mission Control server running on port ${port}`);
});
