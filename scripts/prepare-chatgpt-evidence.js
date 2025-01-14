#!/usr/bin/env node

/**
 * This script prepares evidence files for ChatGPT analysis by:
 * 1. Copying relevant files to a staging area
 * 2. Formatting them for optimal ChatGPT processing
 * 3. Creating a manifest of the prepared files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_FILES = [
    {
        path: 'input/email/sample-email.txt',
        type: 'email',
        description: 'Sample email communications'
    },
    {
        path: 'input/records.json',
        type: 'metadata',
        description: 'Structured message metadata'
    },
    {
        path: 'input/ofw/sample-ofw.txt',
        type: 'messages',
        description: 'Sample OFW messages'
    }
];

const OUTPUT_DIR = 'processed/chatgpt-input';

async function prepareFiles() {
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    const manifest = {
        prepared: new Date().toISOString(),
        files: [],
        uploadOrder: [],
        totalFiles: SOURCE_FILES.length
    };

    // Process each file
    for (const [index, file] of SOURCE_FILES.entries()) {
        const fileName = path.basename(file.path);
        const outputPath = path.join(OUTPUT_DIR, `${index + 1}-${fileName}`);
        
        try {
            // Read and process file based on type
            let content;
            if (file.path.endsWith('.pdf')) {
                const pdfProcessor = (await import('../simple-pdf-processor/src/services/pdf-processor.js')).default;
                const result = await pdfProcessor.process(file.path);
                content = result.raw_content.text;
            } else if (file.path.endsWith('.ods')) {
                const odsProcessor = (await import('../simple-pdf-processor/src/services/ods-processor.js')).default;
                content = await odsProcessor.extractHeaders(file.path);
            } else {
                content = await fs.readFile(file.path, 'utf8');
            }

            // Format content for ChatGPT
            const formatted = formatContent(content, file.type);
            
            // Write formatted content
            await fs.writeFile(outputPath, formatted);
            
            // Add to manifest
            manifest.files.push({
                originalPath: file.path,
                preparedPath: outputPath,
                type: file.type,
                description: file.description,
                size: formatted.length,
                uploadOrder: index + 1
            });
            
            manifest.uploadOrder.push(outputPath);
            
        } catch (error) {
            console.error(`Error processing ${file.path}:`, error);
            process.exit(1);
        }
    }

    // Write manifest
    await fs.writeFile(
        path.join(OUTPUT_DIR, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    // Create README with instructions from template
    const template = await fs.readFile('docs/README_TEMPLATE.md', 'utf8');
    const readme = await generateReadmeFromTemplate(template, manifest);
    await fs.writeFile(
        path.join(OUTPUT_DIR, 'README.md'),
        readme
    );

    console.log(`
Evidence files prepared for ChatGPT analysis:
Location: ${OUTPUT_DIR}
Files prepared: ${manifest.files.length}
Next step: Follow instructions in ${OUTPUT_DIR}/README.md
`);
}

function formatContent(content, type) {
    switch (type) {
        case 'messages':
            return formatMessages(content);
        case 'email':
            return formatEmail(content);
        case 'metadata':
            return formatMetadata(content);
        case 'timeline':
            return formatTimeline(content);
        default:
            return content;
    }
}

function formatMessages(content) {
    // Add clear section headers and formatting
    return `# OFW Messages Analysis File

## Content Type
Communications timeline and message data

## Format
- Each message includes:
  * Timestamp
  * Sender
  * Content
  * Recipients

## Raw Data
${content}`;
}

function formatEmail(content) {
    // Add clear section headers and formatting
    return `# Email Communications Analysis File

## Content Type
Email messages and metadata

## Format
- Each email includes:
  * Date/Time
  * From/To
  * Subject
  * Body
  * Attachments

## Raw Data
${content}`;
}

function formatMetadata(content) {
    // Format structured data
    const data = {
        type: 'email_metadata',
        format: 'structured',
        content: content
    };
    
    return `# Metadata Analysis File

## Content Type
Structured email metadata and labels

## Format
Structured data with:
- Email headers
- Labels and categories
- Relationship mappings

## Raw Data
${JSON.stringify(data, null, 2)}`;
}

function formatTimeline(content) {
    // Add headers and formatting to CSV
    return `# Timeline Analysis File

## Content Type
Event timeline and relationships

## Format
CSV structure with:
- Timestamps
- Event descriptions
- Entity references
- Cross-references

## Raw Data
${content}`;
}

async function generateReadmeFromTemplate(template, manifest) {
    // Replace placeholders in template
    let readme = template
        .replace('{date}', manifest.prepared)
        .replace(/\{(\d+)\}-sample/g, (match, num) => {
            const file = manifest.files[parseInt(num) - 1];
            return path.basename(file.preparedPath);
        });

    // Create required directories and template files
    const analysisDir = path.join('processed', 'analysis');
    await fs.mkdir(analysisDir, { recursive: true });

    // Create empty template files
    const templates = {
        'evidence-report.md': `---
date: ${new Date().toISOString()}
source_files: ${manifest.files.length}
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
- [ ] All events covered
- [ ] All participants identified
- [ ] All relationships mapped
- [ ] All patterns noted

## Quality Check
- [ ] Timeline accuracy
- [ ] Participant roles clear
- [ ] Evidence properly cited
- [ ] Gaps identified

## Follow-up Items
1. [Item needing investigation]
2. [Missing information to gather]
3. [Patterns to verify]`
    };

    // Write template files
    await Promise.all(
        Object.entries(templates).map(([filename, content]) =>
            fs.writeFile(path.join(analysisDir, filename), content)
        )
    );

    return readme;
}

// Export the main function
export default prepareFiles;

// Run the script if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    prepareFiles().catch(console.error);
}
