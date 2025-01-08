import { getLogger } from '../src/utils/logging.js';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

/**
 * Generate test data for different sizes and categories
 */
async function generateTestData() {
    try {
        console.log('\n=== Generating Test Data ===\n');

        // Load OFW template
        const template = JSON.parse(
            await fs.readFile('test-data/metadata/ofw_template.json', 'utf8')
        );

        // Create test data directories
        const testDirs = {
            small: 'tests/fixtures/small',
            medium: 'tests/fixtures/medium',
            large: 'tests/fixtures/large',
            ofw: 'tests/fixtures/ofw',
            emails: 'tests/fixtures/emails',
            edge_cases: 'tests/fixtures/edge_cases'
        };

        for (const dir of Object.values(testDirs)) {
            await fs.mkdir(dir, { recursive: true });
        }

        // Generate OFW test data
        const testCases = [
            {
                name: 'custody_exchange_small.json',
                category: 'custody_logs',
                pattern: 'exchanges',
                count: 50,  // ~50k tokens
                dir: testDirs.small
            },
            {
                name: 'communication_medium.json',
                category: 'communication',
                pattern: 'general',
                count: 500, // ~175k tokens
                dir: testDirs.medium
            },
            {
                name: 'mixed_large.json',
                categories: ['custody_logs', 'communication'],
                count: 1000, // ~350k tokens
                dir: testDirs.large
            }
        ];

        for (const testCase of testCases) {
            console.log(`Generating: ${testCase.name}`);
            
            let content;
            if (testCase.categories) {
                // Mixed category case
                content = generateMixedContent(template, testCase.categories, testCase.count);
            } else {
                // Single category case
                content = generateCategoryContent(
                    template,
                    testCase.category,
                    testCase.pattern,
                    testCase.count
                );
            }

            const filePath = path.join(testCase.dir, testCase.name);
            await fs.writeFile(filePath, JSON.stringify(content, null, 2));

            // Generate corresponding email version
            const emailContent = generateEmailVersion(content, testCase.name);
            const emailPath = path.join(testDirs.emails, `${path.basename(testCase.name, '.json')}.eml`);
            await fs.writeFile(emailPath, emailContent);
        }

        // Generate edge cases
        const edgeCases = [
            {
                name: 'token_limit_exact.json',
                tokens: 200000,
                type: 'repeated_text'
            },
            {
                name: 'token_limit_over.json',
                tokens: 245988,
                type: 'repeated_text'
            },
            {
                name: 'mixed_formats.json',
                type: 'mixed_content'
            }
        ];

        for (const edgeCase of edgeCases) {
            console.log(`Generating edge case: ${edgeCase.name}`);
            const content = generateEdgeCase(edgeCase);
            await fs.writeFile(
                path.join(testDirs.edge_cases, edgeCase.name),
                content
            );
        }

        // Generate test data report
        const report = {
            timestamp: new Date().toISOString(),
            generated_files: {},
            token_counts: {},
            categories: {}
        };

        for (const [category, dir] of Object.entries(testDirs)) {
            const files = await fs.readdir(dir);
            report.generated_files[category] = files;
            
            // Calculate token counts
            for (const file of files) {
                const content = await fs.readFile(path.join(dir, file), 'utf8');
                report.token_counts[file] = Math.ceil(content.length / 4);
            }
        }

        await fs.writeFile(
            'tests/fixtures/test_data_report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n=== Test Data Generation Complete ===\n');
        console.log('Generated Files:');
        for (const [category, files] of Object.entries(report.generated_files)) {
            console.log(`\n${category}:`);
            for (const file of files) {
                console.log(`  - ${file} (${report.token_counts[file].toLocaleString()} tokens)`);
            }
        }
        console.log('\nDetailed report saved to: tests/fixtures/test_data_report.json\n');

    } catch (error) {
        console.error('\nError generating test data:', error.message);
        logger.error('Test data generation failed:', error);
        throw error;
    }
}

function generateCategoryContent(template, category, pattern, count) {
    const fields = template.categories[category].patterns[pattern].fields;
    const content = {
        metadata: {
            category,
            pattern,
            generated: new Date().toISOString(),
            count
        },
        entries: []
    };

    for (let i = 0; i < count; i++) {
        const entry = {};
        for (const field of fields) {
            entry[field] = generateFieldValue(field, i);
        }
        content.entries.push(entry);
    }

    return content;
}

function generateMixedContent(template, categories, count) {
    const content = {
        metadata: {
            categories,
            generated: new Date().toISOString(),
            count
        },
        entries: []
    };

    for (let i = 0; i < count; i++) {
        const category = categories[i % categories.length];
        const patterns = Object.keys(template.categories[category].patterns);
        const pattern = patterns[i % patterns.length];
        const fields = template.categories[category].patterns[pattern].fields;

        const entry = {
            category,
            pattern,
            data: {}
        };

        for (const field of fields) {
            entry.data[field] = generateFieldValue(field, i);
        }

        content.entries.push(entry);
    }

    return content;
}

function generateFieldValue(field, index) {
    const date = new Date();
    date.setDate(date.getDate() - (index % 30));

    switch (field) {
        case 'scheduled_time':
        case 'actual_time':
        case 'date':
            return date.toISOString();
        case 'location':
            return `Location ${(index % 5) + 1}`;
        case 'parent_1':
            return 'John Smith';
        case 'parent_2':
            return 'Jane Doe';
        case 'children':
            return ['Child 1', 'Child 2'];
        case 'notes':
            return generateNote(index);
        case 'topic':
            return `Topic ${(index % 10) + 1}`;
        case 'description':
            return generateDescription(index);
        default:
            return `Value ${index + 1}`;
    }
}

function generateNote(index) {
    return `Detailed notes for entry ${index + 1}. This includes multiple sentences to ensure realistic content length and structure. Additional context and information provided for testing purposes. Various details about the exchange, communication, or event being documented.`;
}

function generateDescription(index) {
    return `Comprehensive description for entry ${index + 1}. This contains multiple paragraphs and detailed information to test processing capabilities.

Paragraph 2 with additional context and specific details about the situation. Including various aspects that need to be documented and analyzed.

Paragraph 3 with follow-up information and relevant details about actions taken or required. This helps test the system's ability to handle longer content blocks.`;
}

function generateEmailVersion(content, originalName) {
    const subject = `OFW Update: ${path.basename(originalName, '.json')}`;
    const date = new Date().toUTCString();
    
    return `From: system@ofw.example.com
To: parent@example.com
Subject: ${subject}
Date: ${date}
Content-Type: text/plain; charset=UTF-8

${JSON.stringify(content, null, 2)}`;
}

function generateEdgeCase({ tokens, type }) {
    switch (type) {
        case 'repeated_text':
            // Generate exact number of tokens (4 chars per token)
            return 'A'.repeat(tokens * 4);
            
        case 'mixed_content':
            return generateMixedFormatContent();
            
        default:
            throw new Error(`Unknown edge case type: ${type}`);
    }
}

function generateMixedFormatContent() {
    return `From: mixed@example.com
To: test@example.com
Subject: Mixed Format Test
Date: ${new Date().toUTCString()}

=== Section 1: Plain Text ===
Regular text content for testing.

=== Section 2: JSON ===
${JSON.stringify({ key: 'value' }, null, 2)}

=== Section 3: Base64 ===
${Buffer.from('Test content').toString('base64')}

=== Section 4: Special Characters ===
Unicode: 世界, 🌟, ñ, é
HTML: <div>Test</div>
URLs: https://example.com`;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    generateTestData()
        .catch(error => {
            console.error('Generation failed:', error);
            process.exit(1);
        });
}

export default generateTestData;
