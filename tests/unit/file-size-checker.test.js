import { checkFileSize, formatSizeCheckResult, SIZE_LIMITS } from '../../src/utils/file-size-checker.js';

describe('File Size Checker', () => {
    test('provides guidance for different file sizes', () => {
        const testCases = [
            {
                name: 'Small file (0.5MB)',
                size: 0.5 * 1024 * 1024,
                expectedCategory: 'single_chunk'
            },
            {
                name: 'Just over single chunk (0.7MB)',
                size: 0.7 * 1024 * 1024,
                expectedCategory: 'small_multi_chunk'
            },
            {
                name: 'Medium file (5MB)',
                size: 5 * 1024 * 1024,
                expectedCategory: 'medium_multi_chunk'
            },
            {
                name: 'Large file (15MB)',
                size: 15 * 1024 * 1024,
                expectedCategory: 'large_multi_chunk'
            },
            {
                name: 'Too large (35MB)',
                size: 35 * 1024 * 1024,
                expectedCategory: 'too_large'
            }
        ];

        testCases.forEach(({ name, size, expectedCategory }) => {
            console.log(`\nTesting: ${name}`);
            const result = checkFileSize(size);
            console.log(formatSizeCheckResult(result));
            
            expect(result.category).toBe(expectedCategory);
            if (size > SIZE_LIMITS.MAX_SIZE) {
                expect(result.canProcess).toBe(false);
                expect(result.error).toBeDefined();
            } else {
                expect(result.canProcess).toBe(true);
                expect(result.guidance).toBeDefined();
            }
        });
    });

    test('provides accurate processing estimates', () => {
        const size = 10 * 1024 * 1024; // 10MB
        const result = checkFileSize(size);

        // Check token estimation
        expect(result.estimatedTokens).toBe(Math.ceil(size / 4));

        // Check chunk estimation
        const expectedChunks = Math.ceil(size / SIZE_LIMITS.SINGLE_CHUNK);
        expect(result.estimatedChunks).toBe(expectedChunks);

        // Check processing time estimation
        expect(result.metrics.estimatedProcessingTime).toBe(expectedChunks * 5000);
    });

    test('formats messages clearly', () => {
        // Test small file message
        const smallResult = checkFileSize(0.5 * 1024 * 1024);
        const smallMessage = formatSizeCheckResult(smallResult);
        expect(smallMessage).toContain('File Size: 0.5MB');
        expect(smallMessage).toContain('single chunk');

        // Test large file message
        const largeResult = checkFileSize(35 * 1024 * 1024);
        const largeMessage = formatSizeCheckResult(largeResult);
        expect(largeMessage).toContain('exceeds maximum limit');
        expect(largeMessage).toContain('split the file');
    });

    test('handles edge cases', () => {
        const edgeCases = [
            { size: SIZE_LIMITS.SINGLE_CHUNK - 1, name: 'Just under single chunk' },
            { size: SIZE_LIMITS.SINGLE_CHUNK + 1, name: 'Just over single chunk' },
            { size: SIZE_LIMITS.MAX_SIZE - 1, name: 'Just under max' },
            { size: SIZE_LIMITS.MAX_SIZE + 1, name: 'Just over max' }
        ];

        edgeCases.forEach(({ size, name }) => {
            console.log(`\nTesting edge case: ${name}`);
            const result = checkFileSize(size);
            console.log(formatSizeCheckResult(result));

            if (size > SIZE_LIMITS.MAX_SIZE) {
                expect(result.canProcess).toBe(false);
                expect(result.error).toBeDefined();
            } else {
                expect(result.canProcess).toBe(true);
                expect(result.guidance).toBeDefined();
            }
        });
    });

    test('provides helpful error messages', () => {
        const tooLarge = checkFileSize(40 * 1024 * 1024);
        const message = formatSizeCheckResult(tooLarge);

        console.log('\nTesting error message for too large file:');
        console.log(message);

        expect(message).toContain('Error:');
        expect(message).toContain('40.0MB');
        expect(message).toContain('30MB');
        expect(message).toContain('Recommendation:');
        expect(message).toContain('split the file');
    });
});
