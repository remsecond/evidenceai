export default {
    // Extend base Jest config
    preset: './jest.config.js',
    
    // Staging-specific settings
    testEnvironment: 'node',
    
    // Test files pattern
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/integration/**/*.test.js',
        '**/tests/load/**/*.test.js'
    ],
    
    // Setup files
    setupFiles: [
        './tests/setup.js',
        './tests/setup.staging.js'
    ],
    
    // Coverage settings
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'json'],
    coverageDirectory: 'coverage/staging',
    
    // Report settings
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: './reports/staging',
                outputName: 'junit.xml',
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
                ancestorSeparator: ' › ',
                usePathForSuiteName: true
            }
        ]
    ],
    
    // Global settings
    globals: {
        'NODE_ENV': 'staging'
    },
    
    // Test timeout
    testTimeout: 30000,
    
    // Parallel test execution
    maxConcurrency: 4,
    
    // Module resolution
    moduleDirectories: ['node_modules', 'src'],
    
    // Transform settings
    transform: {},
    
    // Test environment variables
    testEnvironmentOptions: {
        url: 'http://localhost:3000'
    },
    
    // Verbose output for debugging
    verbose: true,
    
    // Custom resolver
    resolver: null,
    
    // Global setup/teardown
    globalSetup: './tests/global-setup.staging.js',
    globalTeardown: './tests/global-teardown.staging.js',
    
    // Watch plugins
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname'
    ],
    
    // Additional options for staging
    projects: [
        {
            displayName: 'API Tests',
            testMatch: ['**/tests/integration/**/*.test.js'],
            setupFiles: ['./tests/setup.api.js']
        },
        {
            displayName: 'Load Tests',
            testMatch: ['**/tests/load/**/*.test.js'],
            setupFiles: ['./tests/setup.load.js']
        },
        {
            displayName: 'Unit Tests',
            testMatch: ['**/tests/unit/**/*.test.js']
        }
    ],
    
    // Custom reporters
    reporters: [
        'default',
        [
            './tests/custom-reporters/monitoring-reporter.js',
            {
                outputFile: './reports/staging/monitoring.json',
                includePerformanceMetrics: true,
                includeMemoryMetrics: true,
                includeCoverageMetrics: true
            }
        ]
    ]
};
