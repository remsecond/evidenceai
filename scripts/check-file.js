import fs from 'fs/promises';
import path from 'path';

const TEST_FILE = path.join(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');

async function checkFile() {
    try {
        console.log('Current working directory:', process.cwd());
        console.log('Looking for file:', TEST_FILE);
        
        const stats = await fs.stat(TEST_FILE);
        console.log('File exists:', {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
        });
        
        const content = await fs.readFile(TEST_FILE);
        console.log('Successfully read file:', {
            size: content.length,
            preview: content.slice(0, 100)
        });
    } catch (error) {
        console.error('Error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    }
}

checkFile().catch(console.error);
