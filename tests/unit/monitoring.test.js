import {
    trackProcessingTime,
    trackError,
    trackPattern,
    trackModelUsage,
    trackParsingResult,
    getMetrics
} from '../../src/services/monitoring.js';

describe('Monitoring Service', () => {
    describe('Processing Time Tracking', () => {
        test('tracks operation duration', () => {
            trackProcessingTime('email_parsing', 100);
            trackProcessingTime('email_parsing', 200);
            
            const metrics = getMetrics();
            const processingMetrics = metrics.processing.find(m => m.operation === 'email_parsing');
            
            expect(processingMetrics).toBeDefined();
            expect(processingMetrics.count).toBe(2);
            expect(processingMetrics.averageTime).toBe(150);
            expect(processingMetrics.minTime).toBe(100);
            expect(processingMetrics.maxTime).toBe(200);
        });

        test('handles multiple operations', () => {
            trackProcessingTime('email_parsing', 100);
            trackProcessingTime('ai_analysis', 300);
            
            const metrics = getMetrics();
            expect(metrics.processing).toHaveLength(2);
        });
    });

    describe('Error Tracking', () => {
        test('tracks error counts and types', () => {
            const error1 = new TypeError('Invalid input');
            const error2 = new Error('Processing failed');
            
            trackError('parsing', error1);
            trackError('parsing', error2);
            
            const metrics = getMetrics();
            const errorMetrics = metrics.errors.find(e => e.category === 'parsing');
            
            expect(errorMetrics.count).toBe(2);
            expect(errorMetrics.errorTypes).toContainEqual(['TypeError', 1]);
            expect(errorMetrics.errorTypes).toContainEqual(['Error', 1]);
        });

        test('maintains recent error history', () => {
            const error = new Error('Test error');
            for (let i = 0; i < 12; i++) {
                trackError('test', error);
            }
            
            const metrics = getMetrics();
            const errorMetrics = metrics.errors.find(e => e.category === 'test');
            
            expect(errorMetrics.recentErrors).toHaveLength(10); // Max recent errors
            expect(errorMetrics.count).toBe(12); // Total count preserved
        });
    });

    describe('Pattern Tracking', () => {
        test('tracks pattern frequencies', () => {
            trackPattern('email_thread', { context: 'business' });
            trackPattern('email_thread', { context: 'business' });
            trackPattern('email_thread', { context: 'personal' });
            
            const metrics = getMetrics();
            const patternMetrics = metrics.patterns.find(p => p.type === 'email_thread');
            
            expect(patternMetrics.count).toBe(3);
            expect(patternMetrics.contexts).toContainEqual(['business', 2]);
            expect(patternMetrics.contexts).toContainEqual(['personal', 1]);
        });

        test('limits pattern examples', () => {
            for (let i = 0; i < 10; i++) {
                trackPattern('test_pattern', { 
                    context: 'test',
                    data: `example ${i}`
                });
            }
            
            const metrics = getMetrics();
            const patternMetrics = metrics.patterns.find(p => p.type === 'test_pattern');
            
            expect(patternMetrics.examples).toHaveLength(5); // Max examples
            expect(patternMetrics.count).toBe(10); // Total count preserved
        });
    });

    describe('Model Usage Tracking', () => {
        test('tracks token usage per model', () => {
            trackModelUsage('gpt-4', 'analysis', 100);
            trackModelUsage('gpt-4', 'analysis', 150);
            trackModelUsage('gpt-4', 'summary', 50);
            
            const metrics = getMetrics();
            const modelMetrics = metrics.models.find(m => m.model === 'gpt-4');
            
            expect(modelMetrics.totalTokens).toBe(300);
            expect(modelMetrics.calls).toBe(3);
            
            const operations = new Map(modelMetrics.operations);
            expect(operations.get('analysis')).toEqual({ count: 2, tokens: 250 });
            expect(operations.get('summary')).toEqual({ count: 1, tokens: 50 });
        });
    });

    describe('Parsing Result Tracking', () => {
        test('tracks success and failure rates', () => {
            // Simulate some successes and failures
            trackParsingResult('email', true);
            trackParsingResult('email', true);
            trackParsingResult('email', false);
            trackParsingResult('document', true);
            trackParsingResult('document', false);
            
            const metrics = getMetrics();
            
            // Check overall stats
            expect(metrics.parsing.overall.success).toBe(3);
            expect(metrics.parsing.overall.failure).toBe(2);
            expect(metrics.parsing.overall.successRate).toBe(60);
            
            // Check type-specific stats
            const emailStats = metrics.parsing.byType.find(t => t.type === 'email');
            expect(emailStats.success).toBe(2);
            expect(emailStats.failure).toBe(1);
            expect(emailStats.successRate).toBe(66.66666666666666);
            
            const docStats = metrics.parsing.byType.find(t => t.type === 'document');
            expect(docStats.success).toBe(1);
            expect(docStats.failure).toBe(1);
            expect(docStats.successRate).toBe(50);
        });
    });

    describe('Error Handling', () => {
        test('handles invalid inputs gracefully', () => {
            expect(() => trackProcessingTime(null, 'invalid')).not.toThrow();
            expect(() => trackError(null, null)).not.toThrow();
            expect(() => trackPattern(null, null)).not.toThrow();
            expect(() => trackModelUsage(null, null, 'invalid')).not.toThrow();
            expect(() => trackParsingResult(null, 'invalid')).not.toThrow();
        });
    });
});
