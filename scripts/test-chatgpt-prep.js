#!/usr/bin/env node

/**
 * This script tests the ChatGPT evidence preparation process by:
 * 1. Running the preparation script
 * 2. Verifying all expected files and directories are created
 * 3. Checking file contents and formatting
 */

const fs = require('fs').promises;
const path = require('path');
const assert = require('assert').strict;

async function runTests() {
    console.log('Testing ChatGPT evidence preparation...\n');

    try {
        // Clean up any existing test output
        await cleanup();

        // Run the preparation script
        console.log('Running preparation script...');
        const prepareEvidence = await import('./prepare-chatgpt-evidence.js');
        await prepareEvidence.default();

        // Verify directory structure
        console.log('\nVerifying directory structure...');
        await verifyDirectories();

        // Verify files
        console.log('\nVerifying prepared files...');
        await verifyFiles();

        // Verify file contents
        console.log('\nVerifying file contents...');
        await verifyContents();

        console.log('\n✓ All tests passed!');
        console.log('\nTest output available in:');
        console.log('- processed/chatgpt-input/');
        console.log('- processed/analysis/');

    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        process.exit(1);
    }
}

async function cleanup() {
    try {
        await fs.rm('processed', { recursive: true, force: true });
    } catch (error) {
        // Ignore errors if directory doesn't exist
    }
}

async function verifyDirectories() {
    // Check main directories exist
    await assertDirectoryExists('processed');
    await assertDirectoryExists('processed/chatgpt-input');
    await assertDirectoryExists('processed/analysis');
}

async function verifyFiles() {
    // Check input files
    const inputFiles = await fs.readdir('processed/chatgpt-input');
    assert(inputFiles.length >= 5, 'Missing input files'); // 3 evidence files + README + manifest

    // Check analysis template files
    const analysisFiles = await fs.readdir('processed/analysis');
    assert(analysisFiles.includes('evidence-report.md'), 'Missing evidence-report.md');
    assert(analysisFiles.includes('findings.json'), 'Missing findings.json');
    assert(analysisFiles.includes('review-notes.md'), 'Missing review-notes.md');
}

async function verifyContents() {
    // Check manifest.json
    const manifest = JSON.parse(
        await fs.readFile('processed/chatgpt-input/manifest.json', 'utf8')
    );
    assert(manifest.files.length === 3, 'Incorrect number of files in manifest');
    assert(manifest.uploadOrder.length === 3, 'Incorrect upload order in manifest');

    // Check README.md
    const readme = await fs.readFile('processed/chatgpt-input/README.md', 'utf8');
    assert(readme.includes('# ChatGPT Evidence Analysis Instructions'), 'Invalid README format');
    assert(readme.includes('## Step 1: Open ChatGPT'), 'Missing instructions in README');

    // Check evidence-report.md template
    const report = await fs.readFile('processed/analysis/evidence-report.md', 'utf8');
    assert(report.includes('---'), 'Missing frontmatter in evidence-report.md');
    assert(report.includes('model: gpt-4'), 'Missing model specification');

    // Check findings.json template
    const findings = JSON.parse(
        await fs.readFile('processed/analysis/findings.json', 'utf8')
    );
    assert(Array.isArray(findings.timeline), 'Invalid findings.json structure');
    assert(Array.isArray(findings.participants), 'Invalid findings.json structure');

    // Check review-notes.md template
    const notes = await fs.readFile('processed/analysis/review-notes.md', 'utf8');
    assert(notes.includes('# Analysis Review Notes'), 'Invalid review-notes.md format');
    assert(notes.includes('## Completeness Check'), 'Missing sections in review-notes.md');
}

async function assertDirectoryExists(dir) {
    try {
        const stats = await fs.stat(dir);
        assert(stats.isDirectory(), `${dir} is not a directory`);
    } catch (error) {
        throw new Error(`Directory ${dir} does not exist`);
    }
}

// Run the tests
runTests().catch(console.error);
