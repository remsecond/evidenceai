import { Reporter } from '@jest/reporters';
import fs from 'fs/promises';
import path from 'path';
import { performance, PerformanceObserver } from 'perf_hooks';

class MonitoringReporter extends Reporter {
    constructor(globalConfig, options) {
        super(globalConfig);
        this.outputFile = options.outputFile || './reports/monitoring.json';
        this.includePerformanceMetrics = options.includePerformanceMetrics || false;
        this.includeMemoryMetrics = options.includeMemoryMetrics || false;
        this.includeCoverageMetrics = options.includeCoverageMetrics || false;
        
        this.metrics = {
            startTime: Date.now(),
            endTime: null,
            testResults: [],
            performance: {},
            memory: {},
            coverage: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0
            }
        };

        // Setup performance observer
        if (this.includePerformanceMetrics) {
            this.observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    this.metrics.performance[entry.name] = {
                        duration: entry.duration,
                        startTime: entry.startTime,
                        entryType: entry.entryType
                    };
                });
            });
            this.observer.observe({ entryTypes: ['measure', 'mark'] });
        }
    }

    onRunStart() {
        performance.mark('test-suite-start');
    }

    onTestStart(test) {
        performance.mark(`test-${test.path}-start`);
        
        if (this.includeMemoryMetrics) {
            this.captureMemoryMetrics(`${test.path}-start`);
        }
    }

    onTestResult(test, testResult) {
        performance.mark(`test-${test.path}-end`);
        performance.measure(
            `test-${test.path}-duration`,
            `test-${test.path}-start`,
            `test-${test.path}-end`
        );

        if (this.includeMemoryMetrics) {
            this.captureMemoryMetrics(`${test.path}-end`);
        }

        // Collect test results
        this.metrics.testResults.push({
            path: test.path,
            duration: testResult.perfStats.runtime,
            status: this.getTestStatus(testResult),
            numPassingTests: testResult.numPassingTests,
            numFailingTests: testResult.numFailingTests,
            numPendingTests: testResult.numPendingTests,
            memoryUsage: this.includeMemoryMetrics ? process.memoryUsage() : null,
            coverage: this.includeCoverageMetrics ? testResult.coverage : null
        });

        // Update summary
        this.metrics.summary.total++;
        if (testResult.numFailingTests > 0) this.metrics.summary.failed++;
        else if (testResult.numPassingTests > 0) this.metrics.summary.passed++;
        else this.metrics.summary.skipped++;
    }

    async onRunComplete(contexts, results) {
        performance.mark('test-suite-end');
        performance.measure(
            'total-test-suite-duration',
            'test-suite-start',
            'test-suite-end'
        );

        this.metrics.endTime = Date.now();
        this.metrics.summary.duration = this.metrics.endTime - this.metrics.startTime;

        // Collect final memory metrics
        if (this.includeMemoryMetrics) {
            this.metrics.memory.final = process.memoryUsage();
        }

        // Collect coverage metrics
        if (this.includeCoverageMetrics && results.coverageMap) {
            this.metrics.coverage = results.coverageMap.getCoverageSummary().toJSON();
        }

        // Ensure output directory exists
        const outputDir = path.dirname(this.outputFile);
        await fs.mkdir(outputDir, { recursive: true });

        // Write metrics to file
        await fs.writeFile(
            this.outputFile,
            JSON.stringify(this.metrics, null, 2)
        );

        // Log summary
        console.log('\nMonitoring Report Summary:');
        console.log(`Total Tests: ${this.metrics.summary.total}`);
        console.log(`Passed: ${this.metrics.summary.passed}`);
        console.log(`Failed: ${this.metrics.summary.failed}`);
        console.log(`Skipped: ${this.metrics.summary.skipped}`);
        console.log(`Duration: ${this.metrics.summary.duration}ms`);

        if (this.includeMemoryMetrics) {
            const memoryUsage = process.memoryUsage();
            console.log('\nMemory Usage:');
            console.log(`Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
            console.log(`Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
            console.log(`RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);
        }

        // Cleanup
        if (this.includePerformanceMetrics) {
            this.observer.disconnect();
        }
    }

    getTestStatus(testResult) {
        if (testResult.numFailingTests > 0) return 'failed';
        if (testResult.numPassingTests > 0) return 'passed';
        return 'skipped';
    }

    captureMemoryMetrics(label) {
        const memoryUsage = process.memoryUsage();
        this.metrics.memory[label] = {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            rss: memoryUsage.rss,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers
        };
    }
}

export default MonitoringReporter;
