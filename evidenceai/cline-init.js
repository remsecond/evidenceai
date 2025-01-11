import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function initializeContext() {
    console.log('Initializing EvidenceAI development context...');

    // Get project root directory
    const projectRoot = path.join(__dirname, '..');
    console.log('Project root:', projectRoot);

    // Create required directories
    const dirs = ['.cline', 'session_logs', 'demos'];
    dirs.forEach(dir => {
        const dirPath = path.join(projectRoot, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
        }
    });

    // Initialize context file
    const contextPath = path.join(projectRoot, '.cline', 'context.json');
    if (!fs.existsSync(contextPath)) {
        const initialContext = {
            lastSession: {
                date: new Date().toISOString(),
                focus: 'Not set',
                progress: 'No progress recorded'
            },
            sessions: [],
            environment: {
                initialized: new Date().toISOString(),
                version: '1.0.0'
            }
        };
        fs.writeFileSync(contextPath, JSON.stringify(initialContext, null, 2));
        console.log('Created initial context file');
    }

    // Create session log for tracking
    const date = new Date();
    const sessionLogPath = path.join(
        projectRoot,
        'session_logs',
        `session_${date.toISOString().split('T')[0]}.log`
    );
    
    const logEntry = `
Session Started: ${date.toISOString()}
Environment: Development
Context Initialized: Yes
-------------------
`;

    fs.appendFileSync(sessionLogPath, logEntry);
    console.log('Session log initialized');

    console.log('\nContext initialization complete');
    console.log('Open dev_protocol.html in Edge to access Mission Control');
}

// Run initialization
initializeContext();
