import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../src/utils/logging.js';

const logger = getLogger();

const TEST_DATA_STRUCTURE = {
    emails: {
        gmail: {
            description: 'Gmail exports',
            labels: ['personal', 'business', 'legal']
        },
        outlook: {
            description: 'Outlook exports',
            labels: ['work', 'client-communication']
        },
        family_wizard: {
            description: 'Our Family Wizard exports',
            labels: ['family-court', 'custody', 'communication']
        }
    },
    messages: {
        text: {
            description: 'Text message exports',
            labels: ['sms', 'mms', 'chat']
        }
    },
    documents: {
        legal: {
            description: 'Legal documents',
            labels: ['court-orders', 'agreements', 'filings']
        },
        financial: {
            description: 'Financial documents',
            labels: ['statements', 'receipts', 'invoices']
        }
    }
};

/**
 * Create test data directory structure
 */
async function createDirectoryStructure() {
    const baseDir = 'test-data';
    const dirs = ['input', 'output', 'metadata'];

    logger.info('Creating test data directory structure...');

    try {
        // Create base directories
        for (const dir of dirs) {
            await fs.mkdir(path.join(baseDir, dir), { recursive: true });
        }

        // Create category directories
        for (const [category, types] of Object.entries(TEST_DATA_STRUCTURE)) {
            for (const type of Object.keys(types)) {
                await fs.mkdir(
                    path.join(baseDir, 'input', category, type),
                    { recursive: true }
                );
                await fs.mkdir(
                    path.join(baseDir, 'output', category, type),
                    { recursive: true }
                );
            }
        }

        logger.info('Directory structure created successfully');
    } catch (error) {
        logger.error('Error creating directory structure', { error });
        throw error;
    }
}

/**
 * Generate metadata file
 */
async function generateMetadata() {
    const metadata = {
        timestamp: new Date().toISOString(),
        structure: TEST_DATA_STRUCTURE,
        files: {}
    };

    logger.info('Generating metadata file...');

    try {
        const metadataPath = path.join('test-data', 'metadata', 'labels.json');
        await fs.writeFile(
            metadataPath,
            JSON.stringify(metadata, null, 2)
        );

        logger.info('Metadata file generated successfully');
    } catch (error) {
        logger.error('Error generating metadata file', { error });
        throw error;
    }
}

/**
 * Create README files with instructions
 */
async function createReadmeFiles() {
    const readmeContent = `# Test Data Directory

This directory contains test data for the EvidenceAI system.

## Structure

- input/: Place input files here
  - emails/
    - gmail/: Gmail exports
    - outlook/: Outlook exports
    - family_wizard/: Our Family Wizard exports
  - messages/
    - text/: Text message exports
  - documents/
    - legal/: Legal documents
    - financial/: Financial documents

- output/: Processed results will be stored here
- metadata/: Contains metadata and labels

## Usage

1. Place your test files in the appropriate input directories
2. Update metadata/labels.json if needed
3. Run the processing script:
   \`\`\`bash
   npm run process:test-data
   \`\`\`
4. Check the output directory for results

## File Types

- Emails: .eml, .msg
- Documents: .pdf, .docx
- Messages: .txt

## Labels

Each category has specific labels for organization:

${Object.entries(TEST_DATA_STRUCTURE)
    .map(([category, types]) => `
### ${category}
${Object.entries(types)
    .map(([type, info]) => `
- ${type}: ${info.description}
  Labels: ${info.labels.join(', ')}`)
    .join('\n')}`)
    .join('\n')}
`;

    try {
        // Create main README
        await fs.writeFile(
            path.join('test-data', 'README.md'),
            readmeContent
        );

        // Create placeholder READMEs in each category
        for (const [category, types] of Object.entries(TEST_DATA_STRUCTURE)) {
            for (const [type, info] of Object.entries(types)) {
                const typeReadme = `# ${type} Test Data

${info.description}

## Labels
${info.labels.map(label => `- ${label}`).join('\n')}

## Guidelines
1. Place ${type} files in this directory
2. Ensure files are in supported formats
3. Update metadata if needed
`;

                await fs.writeFile(
                    path.join('test-data', 'input', category, type, 'README.md'),
                    typeReadme
                );
            }
        }

        logger.info('README files created successfully');
    } catch (error) {
        logger.error('Error creating README files', { error });
        throw error;
    }
}

/**
 * Main setup function
 */
async function setup() {
    try {
        logger.info('Starting test data setup...');

        await createDirectoryStructure();
        await generateMetadata();
        await createReadmeFiles();

        logger.info('Test data setup completed successfully');
        
        console.log(`
Test data structure has been created!

To get started:
1. Place your test files in test-data/input/[category]/[type]/
2. Update metadata in test-data/metadata/labels.json if needed
3. Run the processing script with:
   npm run process:test-data

See test-data/README.md for more details.
`);
    } catch (error) {
        logger.error('Setup failed', { error });
        process.exit(1);
    }
}

// Run setup if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    setup();
}

export { setup, TEST_DATA_STRUCTURE };
