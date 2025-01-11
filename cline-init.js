#!/usr/bin/env node
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * This script initializes Cline's context by:
 * 1. Loading the latest session log
 * 2. Loading the latest demo information
 * 3. Setting up project context
 * 
 * This ensures Cline maintains awareness of:
 * - Current development state
 * - Last working features
 * - Project history and context
 */

function getLatestSessionLog() {
    const logsDir = join(__dirname, 'session_logs');
    if (!fs.existsSync(logsDir)) return null;

    const logs = fs.readdirSync(logsDir)
        .filter(f => f.startsWith('session_'))
        .sort()
        .reverse();

    if (logs.length === 0) return null;

    const latestLog = fs.readFileSync(join(logsDir, logs[0]), 'utf8');
    return {
        path: logs[0],
        content: latestLog
    };
}

function getLatestDemo() {
    const demosDir = join(__dirname, 'demos');
    if (!fs.existsSync(demosDir)) return null;

    const demos = fs.readdirSync(demosDir)
        .filter(f => f.startsWith('demo_'))
        .sort()
        .reverse();

    if (demos.length === 0) return null;

    return {
        path: demos[0],
        date: demos[0].split('_')[1],
        feature: demos[0].split('_').slice(2).join('_').replace('.mp4', '')
    };
}

function generateContext() {
    const latestSession = getLatestSessionLog();
    const latestDemo = getLatestDemo();
    const protocol = fs.readFileSync(join(__dirname, 'DEVELOPMENT_PROTOCOL.md'), 'utf8');

    const context = {
        projectName: 'EvidenceAI',
        protocol: protocol,
        lastSession: latestSession,
        lastDemo: latestDemo,
        workingDirectory: __dirname,
        checkpoints: {
            enabled: true,
            location: join(__dirname, 'checkpoints')
        }
    };

    // Write context for Cline
    const contextDir = join(__dirname, '.cline');
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir);
    }

    fs.writeFileSync(
        join(contextDir, 'context.json'),
        JSON.stringify(context, null, 2)
    );

    // Create a README that explains the context system
    const readmeContent = `# Cline Context System

This directory maintains Cline's awareness of:
- Development protocol and rules
- Latest working demo
- Session history and progress
- Project checkpoints

When starting a new task, Cline will:
1. Load this context
2. Review the latest demo
3. Understand current project state
4. Apply development protocols

This ensures consistent context across sessions.`;

    fs.writeFileSync(
        join(contextDir, 'README.md'),
        readmeContent
    );

    return context;
}

// Generate and save context
const context = generateContext();

// Output context summary
console.log('\n=== Cline Context Initialized ===\n');
console.log('Project:', context.projectName);
if (context.lastSession) {
    console.log('Last Session:', context.lastSession.path);
}
if (context.lastDemo) {
    console.log('Last Demo:', context.lastDemo.path);
    console.log('Feature:', context.lastDemo.feature);
}
console.log('\nContext saved to .cline/context.json');
console.log('\nCline is ready with full project context\n');
