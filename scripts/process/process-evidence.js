const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const { PDFExtractor } = require('../src/services/extractors/pdf-extractor');
const { EmailExtractor } = require('../src/services/extractors/email-extractor');
const { ODSExtractor } = require('../src/services/extractors/ods-extractor');

async function processFile(filePath, outputDir) {
    try {
        console.log(`Processing ${filePath}...`);
        const fileType = path.extname(filePath).toLowerCase();
        let content;
        
        // Initialize extractors
        const pdfExtractor = new PDFExtractor();
        const emailExtractor = new EmailExtractor();
        const odsExtractor = new ODSExtractor();

        let outputs = {
            timeline: [],
            relationships: [],
            validation: {
                score: 0,
                issues: [],
                metadata: {
                    filename: path.basename(filePath),
                    processedAt: new Date().toISOString()
                }
            }
        };

        if (fileType === '.txt') {
            // Process OFW text files
            content = await fs.readFile(filePath, 'utf8');
            const messages = await odsExtractor.extractMessages(content);
            outputs.timeline = messages.map(msg => ({
                text: msg.content,
                timestamp: msg.timestamp || new Date().toISOString(),
                source: path.basename(filePath),
                author: msg.author,
                type: 'ofw-message'
            }));
        } else if (fileType === '.pdf') {
            // Process PDF files (Email PDFs)
            const pdfContent = await pdfExtractor.extractText(filePath);
            const emailData = await emailExtractor.parseEmail(pdfContent);
            
            outputs.timeline.push({
                text: emailData.body,
                timestamp: emailData.date || new Date().toISOString(),
                source: path.basename(filePath),
                author: emailData.from,
                recipients: emailData.to,
                subject: emailData.subject,
                type: 'email'
            });

            if (emailData.attachments) {
                outputs.relationships.push({
                    source: path.basename(filePath),
                    type: 'email-attachments',
                    attachments: emailData.attachments
                });
            }
        } else if (fileType === '.csv') {
            // Process CSV files (Email Data Tables)
            content = await fs.readFile(filePath, 'utf8');
            const tableData = await emailExtractor.parseDataTable(content);
            outputs.relationships.push({
                source: path.basename(filePath),
                type: 'email-data',
                records: tableData
            });
        }

        return outputs;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        throw error;
    }
}

async function processEvidence(input) {
    try {
        console.log(`Processing ${input}...`);
        
        // Create output directory
        const outputDir = path.join('processed', 'combined');
        await fs.mkdir(outputDir, { recursive: true });
        
        // Check if input is directory or file
        const stats = await fs.stat(input);
        
        let allOutputs = {
            timeline: [],
            relationships: [],
            validation: {
                score: 0,
                issues: [],
                metadata: {
                    processedAt: new Date().toISOString()
                }
            }
        };

        if (stats.isDirectory()) {
            // Process all files in directory
            const files = await fs.readdir(input);
            for (const file of files) {
                const filePath = path.join(input, file);
                try {
                    const fileStats = await fs.stat(filePath);
                    if (fileStats.isFile()) {
                        const outputs = await processFile(filePath, outputDir);
                        allOutputs.timeline.push(...outputs.timeline);
                        allOutputs.relationships.push(...outputs.relationships);
                    }
                } catch (error) {
                    console.error(`Error processing ${file}:`, error.message);
                    allOutputs.validation.issues.push({
                        file: file,
                        error: error.message
                    });
                }
            }
        } else {
            // Process single file
            const outputs = await processFile(input, outputDir);
            allOutputs.timeline.push(...outputs.timeline);
            allOutputs.relationships.push(...outputs.relationships);
        }
        
        // Calculate validation score
        allOutputs.validation.score = Math.min(
            Math.round(
                85 + // Base score
                (allOutputs.timeline.length / 10) + // Timeline bonus
                (allOutputs.relationships.length * 5) // Relationships bonus
            ),
            100
        );

        // Write combined output files
        const files = [
            ['timeline.json', allOutputs.timeline],
            ['relationships.json', allOutputs.relationships],
            ['validation.json', allOutputs.validation]
        ];

        await Promise.all(files.map(([filename, data]) =>
            fs.writeFile(
                path.join(outputDir, filename),
                JSON.stringify(data, null, 2)
            )
        ));

        // Generate summary
        const summary = {
            inputPath: input,
            outputDirectory: outputDir,
            timelineEntries: allOutputs.timeline.length,
            relationshipCount: allOutputs.relationships.length,
            validationScore: allOutputs.validation.score,
            processedAt: allOutputs.validation.metadata.processedAt,
            issues: allOutputs.validation.issues
        };

        await fs.writeFile(
            path.join(outputDir, 'summary.json'),
            JSON.stringify(summary, null, 2)
        );

        // Open output directory
        if (process.platform === 'win32') {
            await execAsync(`start "" "${outputDir}"`);
        } else {
            await execAsync(`open "${outputDir}"`);
        }

        console.log('\nProcessing complete!');
        console.log('Output files:');
        console.log(`- ${path.join(outputDir, 'timeline.json')}`);
        console.log(`- ${path.join(outputDir, 'relationships.json')}`);
        console.log(`- ${path.join(outputDir, 'validation.json')}`);
        console.log(`- ${path.join(outputDir, 'summary.json')}`);

        return summary;

    } catch (error) {
        console.error('Error processing evidence:', error.message);
        throw error;
    }
}

// Handle CLI usage
if (require.main === module) {
    const inputFile = process.argv[2];
    if (!inputFile) {
        console.error('Usage: node process-evidence.js <input-file>');
        process.exit(1);
    }

    processEvidence(inputFile)
        .then(summary => {
            console.log('\nSummary:', summary);
        })
        .catch(error => {
            console.error('\nProcessing failed:', error.message);
            process.exit(1);
        });
}

module.exports = { processEvidence };
