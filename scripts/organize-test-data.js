import { processDocument } from '../src/services/document-processing.js';
import { checkFileSize } from '../src/utils/file-size-checker.js';
import { getLogger } from '../src/utils/logging.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

/**
 * Test data categories and their directories
 */
const TEST_DIRS = {
    small: 'tests/fixtures/small',           // < 150k tokens
    medium: 'tests/fixtures/medium',         // 150k-500k tokens
    large: 'tests/fixtures/large',           // 500k-1M tokens
    emails: 'tests/fixtures/emails',         // Email specific tests
    ofw: 'tests/fixtures/ofw',              // OFW specific tests
    edge_cases: 'tests/fixtures/edge_cases', // Edge cases and boundary tests
    invalid: 'tests/fixtures/invalid'        // Invalid files that should fail
};

/**
 * Process and organize test data
 */
async function organizeTestData(sourcePath) {
    try {
        console.log('\n=== Processing Test Data ===\n');

        // Create test directories if they don't exist
        for (const dir of Object.values(TEST_DIRS)) {
            await fs.mkdir(dir, { recursive: true });
        }

        // Get list of files to process
        const files = await fs.readdir(sourcePath);
        console.log(`Found ${files.length} files to process\n`);

        for (const file of files) {
            const filePath = path.join(sourcePath, file);
            const stats = await fs.stat(filePath);

            if (!stats.isFile()) continue;

            console.log(`Processing: ${file}`);
            
            // Check file size and get recommendations
            const content = await fs.readFile(filePath, 'utf8');
            const sizeCheck = checkFileSize(stats.size);

            // Determine target directory based on file characteristics
            let targetDir;
            const tokens = Math.ceil(content.length / 4);

            if (file.endsWith('.eml')) {
                targetDir = TEST_DIRS.emails;
            } else if (file.toLowerCase().includes('ofw')) {
                targetDir = TEST_DIRS.ofw;
            } else if (!sizeCheck.canProcess) {
                targetDir = TEST_DIRS.invalid;
            } else if (tokens < 150000) {
                targetDir = TEST_DIRS.small;
            } else if (tokens < 500000) {
                targetDir = TEST_DIRS.medium;
            } else {
                targetDir = TEST_DIRS.large;
            }

            // Create metadata file
            const metadata = {
                original_name: file,
                size_bytes: stats.size,
                characters: content.length,
                estimated_tokens: tokens,
                validation: sizeCheck,
                processing_date: new Date().toISOString(),
                category: path.basename(targetDir)
            };

            // Copy file to target directory
            const targetPath = path.join(targetDir, file);
            await fs.copyFile(filePath, targetPath);

            // Save metadata
            const metadataPath = path.join(targetDir, `${path.basename(file, path.extname(file))}_meta.json`);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            console.log(`Organized: ${file} -> ${path.relative(process.cwd(), targetPath)}`);
        }

        // Generate test data report
        const report = {
            timestamp: new Date().toISOString(),
            categories: {}
        };

        for (const [category, dir] of Object.entries(TEST_DIRS)) {
            const files = await fs.readdir(dir);
            const testFiles = files.filter(f => !f.endsWith('_meta.json'));
            
            report.categories[category] = {
                file_count: testFiles.length,
                files: testFiles
            };
        }

        await fs.writeFile(
            'tests/fixtures/test_data_report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n=== Test Data Organization Complete ===\n');
        console.log('Test Data Summary:');
        for (const [category, stats] of Object.entries(report.categories)) {
            console.log(`${category}: ${stats.file_count} files`);
        }
        console.log('\nDetailed report saved to: tests/fixtures/test_data_report.json\n');

    } catch (error) {
        console.error('\nError organizing test data:', error.message);
        logger.error('Test data organization failed:', error);
        throw error;
    }
}

// Run if called directly
if (process.argv[2]) {
    const sourcePath = process.argv[2];
    organizeTestData(sourcePath)
        .catch(error => {
            console.error('Organization failed:', error);
            process.exit(1);
        });
} else {
    console.error('Please provide a source directory path');
    process.exit(1);
}

export default organizeTestData;
