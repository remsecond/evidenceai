Soimport { register } from 'node:module';
import { pathToFileURL } from 'url';
import { performance, PerformanceObserver } from 'perf_hooks';

// Enable ES modules for test files
register('ts-node/register');

// Configure global performance monitoring
const perfObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach(entry => {
        if (global.__PERFORMANCE_METRICS__) {
            global.__PERFORMANCE_METRICS__.push({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime,
                entryType: entry.entryType
            });
        }
    });
});

perfObserver.observe({ entryTypes: ['measure', 'mark'] });

// Initialize global metrics storage
global.__PERFORMANCE_METRICS__ = [];
global.__MEMORY_METRICS__ = [];
global.__ERROR_METRICS__ = [];

// Setup memory monitoring
const captureMemoryMetrics = () => {
    const memoryUsage = process.memoryUsage();
    global.__MEMORY_METRICS__.push({
        timestamp: Date.now(),
        ...memoryUsage
    });
};

// Setup periodic memory capture
const memoryMonitoringInterval = setInterval(captureMemoryMetrics, 1000);

// Setup error tracking
const originalConsoleError = console.error;
console.error = (...args) => {
    global.__ERROR_METRICS__.push({
        timestamp: Date.now(),
        message: args.join(' ')
    });
    originalConsoleError.apply(console, args);
};

// Setup test environment
global.beforeAll(async () => {
    // Mark test suite start
    performance.mark('test-suite-start');
    
    // Initial memory capture
    captureMemoryMetrics();
    
    // Setup test database if needed
    if (process.env.NODE_ENV === 'staging') {
        try {
            // Add any staging-specific setup here
            console.log('Setting up staging test environment...');
        } catch (error) {
            console.error('Error setting up staging environment:', error);
            throw error;
        }
    }
});

global.afterAll(async () => {
    // Mark test suite end
    performance.mark('test-suite-end');
    performance.measure(
        'total-test-suite-duration',
        'test-suite-start',
        'test-suite-end'
    );
    
    // Final memory capture
    captureMemoryMetrics();
    
    // Clear monitoring interval
    clearInterval(memoryMonitoringInterval);
    
    // Cleanup
    perfObserver.disconnect();
    
    // Generate final metrics report
    const finalMetrics = {
        performance: global.__PERFORMANCE_METRICS__,
        memory: global.__MEMORY_METRICS__,
        errors: global.__ERROR_METRICS__,
        summary: {
            totalDuration: performance.nodeTiming.duration,
            totalMemory: process.memoryUsage(),
            totalErrors: global.__ERROR_METRICS__.length
        }
    };
    
    // Log summary
    console.log('\nStaging Test Metrics Summary:');
    console.log(`Total Duration: ${finalMetrics.summary.totalDuration}ms`);
    console.log(`Peak Memory Usage: ${Math.round(finalMetrics.summary.totalMemory.heapUsed / 1024 / 1024)}MB`);
    console.log(`Total Errors: ${finalMetrics.summary.totalErrors}`);
    
    // Store metrics for the custom reporter
    global.__TEST_METRICS__ = finalMetrics;
});

// Setup test-specific monitoring
global.beforeEach(async () => {
    performance.mark(`test-${expect.getState().currentTestName}-start`);
});

global.afterEach(async () => {
    const testName = expect.getState().currentTestName;
    performance.mark(`test-${testName}-end`);
    performance.measure(
        `test-${testName}-duration`,
        `test-${testName}-start`,
        `test-${testName}-end`
    );
    
    // Capture memory usage after each test
    captureMemoryMetrics();
});

// Helper functions for tests
global.getTestMetrics = () => {
    return {
        performance: global.__PERFORMANCE_METRICS__,
        memory: global.__MEMORY_METRICS__,
        errors: global.__ERROR_METRICS__
    };
};

// Export setup utilities for use in tests
export const utils = {
    captureMemoryMetrics,
    getTestMetrics: global.getTestMetrics
};
