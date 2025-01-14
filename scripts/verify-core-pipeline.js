#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    testFiles: {
        pdf: path.join(__dirname, '../test/sample-evidence.txt'),
        email: path.join(__dirname, '../input/Email exchange with christinemoyer_hotmail.com after 2024-10-31 before 2025-01-12.pdf')
    },
    timeoutMs: 30000,
    requiredServices: [
        'pdf-processor',
        'universal-processor',
        'google-sheets'
    ]
};

// Utility to run shell commands
const runCommand = (command, args = []) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { shell: true });
        let output = '';

        proc.stdout.on('data', (data) => {
            output += data.toString();
            console.log(data.toString());
        });

        proc.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with code ${code}`));
            } else {
                resolve(output);
            }
        });
    });
};

// Verification steps
const verificationSteps = {
    async checkFiles() {
        console.log('\n🔍 Checking required files...');
        for (const [key, filepath] of Object.entries(CONFIG.testFiles)) {
            if (!fs.existsSync(filepath)) {
                throw new Error(`Required test file missing: ${key} (${filepath})`);
            }
        }
        console.log('✅ All required files present');
    },

    async verifyServices() {
        console.log('\n🔍 Verifying core services...');
        for (const service of CONFIG.requiredServices) {
            const servicePath = path.join(__dirname, `../src/services/${service}.js`);
            if (!fs.existsSync(servicePath)) {
                throw new Error(`Required service missing: ${service}`);
            }
        }
        console.log('✅ All core services present');
    },

    async runTests() {
        console.log('\n🔍 Running core pipeline tests...');
        try {
            await runCommand('npm', ['test', 'simple-pdf-processor/test/core-pipeline.test.js']);
            console.log('✅ Core pipeline tests passed');
        } catch (error) {
            throw new Error('Core pipeline tests failed');
        }
    },

    async verifyGoogleIntegration() {
        console.log('\n🔍 Verifying Google integration...');
        try {
            await runCommand('node', ['scripts/test-google-access.js']);
            console.log('✅ Google integration verified');
        } catch (error) {
            throw new Error('Google integration verification failed');
        }
    },

    async testProcessing() {
        console.log('\n🔍 Testing document processing...');
        try {
            await runCommand('node', ['scripts/process-evidence.js', CONFIG.testFiles.pdf]);
            console.log('✅ Document processing verified');
        } catch (error) {
            throw new Error('Document processing test failed');
        }
    }
};

// Main verification function
async function verifyCorePipeline() {
    console.log('🚀 Starting core pipeline verification...');
    
    try {
        for (const [step, func] of Object.entries(verificationSteps)) {
            await func();
        }
        
        console.log('\n✨ Core pipeline verification completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        console.log('\nRecommended actions:');
        console.log('1. Check error details above');
        console.log('2. Review docs/RECOVERY_PLAN.md');
        console.log('3. Consider reverting to core-pipeline-stable branch');
        process.exit(1);
    }
}

// Run verification
verifyCorePipeline();
