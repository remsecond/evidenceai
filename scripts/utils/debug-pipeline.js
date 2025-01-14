#!/usr/bin/env node

/**
 * Debug script to test pipeline and LLM integration
 * Runs each component in isolation to identify issues
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

async function debugPipeline() {
    console.log('Starting pipeline debug...\n');

    try {
        // 1. Check directories
        console.log('Checking directories...');
        await checkDirectories();

        // 2. Test sample files
        console.log('\nChecking sample files...');
        await checkSampleFiles();

        // 3. Test pipeline server
        console.log('\nTesting pipeline server...');
        await testPipelineServer();

        // 4. Test LLM preparation
        console.log('\nTesting LLM preparation...');
        await testLLMPrep();

        console.log('\nDebug complete! Check results above for any errors.');

    } catch (error) {
        console.error('\nDebug failed:', error.message);
        console.log('\nTroubleshooting steps:');
        console.log('1. Ensure all required directories exist');
        console.log('2. Verify sample files are accessible');
        console.log('3. Check pipeline server is running');
        console.log('4. Verify LLM preparation process');
    }
}

async function checkDirectories() {
    const dirs = [
        'uploads',
        'processed',
        'processed/pipeline',
        'processed/chatgpt-input',
        'processed/analysis'
    ];

    for (const dir of dirs) {
        try {
            await fs.access(dir);
            console.log(`✓ ${dir} exists`);
        } catch {
            console.log(`× ${dir} missing - creating...`);
            await fs.mkdir(dir, { recursive: true });
        }
    }
}

async function checkSampleFiles() {
    const files = [
        'simple-pdf-processor/test/fixtures/sample-ofw.txt',
        'simple-pdf-processor/test/fixtures/sample-email.txt',
        'simple-pdf-processor/test/fixtures/sample-records.json',
        'simple-pdf-processor/test/fixtures/sample-records.csv'
    ];

    for (const file of files) {
        try {
            await fs.access(file);
            console.log(`✓ ${file} exists`);
            // Copy to uploads for testing
            const filename = path.basename(file);
            await fs.copyFile(file, `uploads/${filename}`);
        } catch {
            console.log(`× ${file} missing or inaccessible`);
        }
    }
}

async function testPipelineServer() {
    return new Promise((resolve) => {
        const curl = exec('curl -X POST http://localhost:3000/api/process');
        
        curl.stdout.on('data', (data) => {
            console.log('Pipeline response:', data);
        });

        curl.stderr.on('data', (data) => {
            if (!data.includes('100%')) { // Ignore progress messages
                console.log('Pipeline error:', data);
            }
        });

        curl.on('close', (code) => {
            if (code === 0) {
                console.log('✓ Pipeline server responding');
            } else {
                console.log('× Pipeline server not responding');
            }
            resolve();
        });
    });
}

async function testLLMPrep() {
    return new Promise((resolve) => {
        const curl = exec('curl -X POST http://localhost:3000/api/prepare-llm');
        
        curl.stdout.on('data', (data) => {
            console.log('LLM prep response:', data);
        });

        curl.stderr.on('data', (data) => {
            if (!data.includes('100%')) {
                console.log('LLM prep error:', data);
            }
        });

        curl.on('close', (code) => {
            if (code === 0) {
                console.log('✓ LLM preparation working');
            } else {
                console.log('× LLM preparation failed');
            }
            resolve();
        });
    });
}

// Run debug
debugPipeline();
