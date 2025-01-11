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

async function endSession() {
  console.log('\n=== EvidenceAI Development Session End ===\n');

  // Get today's session log
  const date = new Date().toISOString().split('T')[0];
  const sessionLogPath = join(__dirname, 'session_logs', `session_${date}.md`);
  
  if (!fs.existsSync(sessionLogPath)) {
    throw new Error('No session log found for today. Did you start the session properly?');
  }

  const sessionLog = fs.readFileSync(sessionLogPath, 'utf8');
  const featureGoal = sessionLog.match(/Feature Goal: (.+)/)?.[1];

  console.log('Session Summary:');
  console.log('---------------');
  console.log(`Feature Goal: ${featureGoal}`);

  // Checklist for session end
  const questions = [
    'Have you recorded a demo of the working feature? (yes/no)',
    'What is the path to the demo recording?',
    'List the specific features completed:',
    'Are there any known issues or limitations?'
  ];

  const answers = [];
  for (const q of questions) {
    const answer = await question(q + '\n> ');
    answers.push(answer);
    
    if (q.includes('recorded a demo') && answer.toLowerCase() === 'no') {
      console.log('\n❌ Cannot end session without a demo recording.');
      console.log('Please record a demo of the working feature first.\n');
      rl.close();
      process.exit(1);
    }
  }

  // Update session log with completion info
  const completionLog = `
${sessionLog}

Session Completion:
------------------
Demo Recording: ${answers[1]}
Completed Features:
${answers[2]}

Known Issues:
${answers[3]}
  `.trim();

  fs.writeFileSync(sessionLogPath, completionLog);

  // Copy demo to demos directory
  const demosDir = join(__dirname, 'demos');
  if (!fs.existsSync(demosDir)) {
    fs.mkdirSync(demosDir);
  }

  const demoPath = answers[1];
  if (fs.existsSync(demoPath)) {
    const demoFileName = `demo_${date}_${featureGoal.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
    fs.copyFileSync(demoPath, join(demosDir, demoFileName));
    console.log(`\n✅ Demo saved as ${demoFileName}`);
  } else {
    console.log('\n⚠️  Warning: Could not find demo file at specified path');
    console.log('Please ensure the demo is properly saved and documented');
  }

  console.log('\n✅ Session log updated');
  console.log('✅ Development session completed');
  console.log('\nRemember: Next session will verify today\'s demo before starting\n');

  rl.close();
}

endSession().catch(error => {
  console.error('\n❌ Session end failed:', error.message);
  process.exit(1);
});
