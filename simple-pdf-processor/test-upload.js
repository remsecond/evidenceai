import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination directories
const sourceDir = 'C:\\Users\\robmo\\OneDrive\\Documents\\evidenceai_test\\input\\3_File_Nov_Jan_Test';
const destDir = 'C:\\Users\\robmo\\Desktop\\evidenceai\\input';

// Expected files
const expectedFiles = [
    'Email exchange with christinemoyer_hotmail.com after 2024-10-31 before 2025-01-12.pdf',
    'label Emails from christinemoyer@hotmail.com after 2024-10-31 before 2025-01-12.ods',
    'OFW_Messages_Report_2025-01-12_09-01-06.pdf'
];

// Ensure directories exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Verify source directory exists
if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
}

// Process all files in source directory
async function processFiles() {
    try {
        // First check if server is running
        console.log('Checking server status...');
        const healthCheck = await fetch('http://localhost:3002/health');
        if (!healthCheck.ok) {
            throw new Error('Server is not running. Please start the server first.');
        }
        console.log('Server is running');

        // Verify all expected files exist
        console.log('\nVerifying source files...');
        for (const file of expectedFiles) {
            const filePath = path.join(sourceDir, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Required file not found: ${file}`);
            }
        }
        console.log('All required files found');

        // Process each file
        console.log('\nStarting file processing...');
        for (const file of expectedFiles) {
            const filePath = path.join(sourceDir, file);
            const destPath = path.join(destDir, file);

            // Skip if already processed
            if (fs.existsSync(destPath)) {
                console.log(`\nFile ${file} already exists in destination, skipping...`);
                continue;
            }

            console.log(`\nProcessing ${file}...`);
            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));

            const response = await fetch('http://localhost:3002/process', {
                method: 'POST',
                body: form
            });

            if (!response.ok) {
                throw new Error(`Failed to process ${file}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.status === 'error') {
                throw new Error(`Error processing ${file}: ${result.message}`);
            }

            console.log('Processing complete:');
            console.log(`- Pages: ${result.pages}`);
            console.log(`- Words: ${result.words}`);
            console.log(`- Processing time: ${result.processingTime}`);
            console.log(`- Destination: ${result.destination}`);
        }

        console.log('\nAll files processed successfully');
        console.log(`Source: ${sourceDir}`);
        console.log(`Destination: ${destDir}`);
    } catch (err) {
        console.error('\nError:', err.message);
        process.exit(1);
    }
}

// Run the processing
console.log('Starting file processing...');
console.log(`Source directory: ${sourceDir}`);
console.log(`Destination directory: ${destDir}`);
processFiles();
