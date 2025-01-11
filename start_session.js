#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

async function checkLastDemo() {
  const demosDir = join(__dirname, 'demos');
  if (!fs.existsSync(demosDir)) {
    console.log('\n⚠️  No demos directory found. Creating one...');
    fs.mkdirSync(demosDir);
    return false;
  }
  
  const demos = fs.readdirSync(demosDir);
  if (demos.length === 0) {
    console.log('\n⚠️  No previous demos found.');
    return false;
  }
  
  const lastDemo = demos.sort().pop();
  console.log(`\nLast demo: ${lastDemo}`);
  return true;
}

async function startSession() {
  console.log('\n=== EvidenceAI Development Session Start ===\n');
  
  // Load and display protocol
  const protocol = fs.readFileSync(join(__dirname, 'DEVELOPMENT_PROTOCOL.md'), 'utf8');
  console.log(protocol);
  
  console.log('\n=== Session Initialization Checklist ===\n');
  
  // Check for last demo
  const hasDemo = await checkLastDemo();
  if (!hasDemo) {
    console.log('⚠️  Warning: No previous demo found. This is expected for first session only.');
  }

  // Interactive checklist
  const questions = [
    'Have you reviewed the development protocol? (yes/no)',
    'What specific feature will you build this session?',
    'Do you have test files ready? (yes/no)',
    'Can you confirm the current main branch is in working state? (yes/no)'
  ];

  const answers = [];
  for (const q of questions) {
    const answer = await question(q + '\n> ');
    answers.push(answer);
    
    if (answer.toLowerCase() === 'no') {
      console.log('\n❌ Session cannot start until all prerequisites are met.');
      console.log('Please address the missing requirements and start again.\n');
      rl.close();
      process.exit(1);
    }
  }

  // Create session log
  const date = new Date().toISOString().split('T')[0];
  const sessionLog = `
Date: ${date}
Feature Goal: ${answers[1]}
Prerequisites Met: Yes
Test Files Ready: ${answers[2]}
Working Branch Confirmed: ${answers[3]}
  `.trim();

  const logsDir = join(__dirname, 'session_logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  
  fs.writeFileSync(
    join(logsDir, `session_${date}.md`),
    sessionLog
  );

  console.log('\n✅ Session prerequisites verified!');
  console.log('✅ Session log created');
  console.log('\n=== Development Session Ready to Begin ===');
  console.log('\nRemember:');
  console.log('1. Every change must be demonstrable');
  console.log('2. No complexity without working basics');
  console.log('3. Record your demo before ending the session\n');

  rl.close();
}

startSession().catch(error => {
  console.error('\n❌ Session initialization failed:', error.message);
  process.exit(1);
});
