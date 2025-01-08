export default {
    transform: {},
    extensionsToTreatAsEsm: ['.js'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    testEnvironment: 'node',
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    testMatch: ['**/tests/**/*.test.js'],
    moduleFileExtensions: ['js', 'json'],
    setupFiles: ['dotenv/config'],
    // Handle ES modules
    transformIgnorePatterns: [
        'node_modules/(?!(module-that-needs-to-be-transformed)/)'
    ],
    // Add test environment setup
    setupFilesAfterEnv: ['./tests/setup.js']
};
