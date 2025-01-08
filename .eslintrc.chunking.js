module.exports = {
    plugins: ['chunking'],
    extends: [
        'plugin:chunking/recommended'
    ],
    rules: {
        // Override default severity levels if needed
        'chunking/require-chunking': 'error',
        'chunking/require-chunking-tests': 'error',
        'chunking/validate-chunking-metadata': 'error'
    },
    overrides: [
        {
            // Apply chunking rules only to service files
            files: ['src/services/**/*.js'],
            rules: {
                'chunking/require-chunking': 'error',
                'chunking/validate-chunking-metadata': 'error'
            }
        },
        {
            // Apply test requirements to all service files
            files: ['src/services/**/*.js'],
            rules: {
                'chunking/require-chunking-tests': 'error'
            }
        },
        {
            // Exclude certain files from chunking requirements
            files: [
                'src/services/document-analyzer.js', // Pattern matching only
                'src/services/document-router.js',   // Routing logic only
                'src/services/monitoring.js'         // Infrastructure only
            ],
            rules: {
                'chunking/require-chunking': 'off',
                'chunking/validate-chunking-metadata': 'off'
            }
        }
    ],
    settings: {
        chunking: {
            // Configure paths for test file lookup
            testDir: 'tests/unit',
            // Configure metadata requirements
            requiredMetadataFields: [
                'enabled',
                'chunk_count',
                'total_tokens',
                'avg_chunk_size'
            ],
            // Configure size limits
            maxChunkSize: 150000,
            warningThreshold: 140000
        }
    }
};
