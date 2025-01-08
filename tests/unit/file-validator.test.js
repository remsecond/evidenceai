import { validateFile, formatValidationResult } from '../../src/utils/file-validator.js';

describe('File Validator', () => {
    describe('Size Validation', () => {
        test('handles files within size limits', async () => {
            const content = 'A'.repeat(100 * 1024); // 100KB
            const result = await validateFile(content);
            expect(result.canProcess).toBe(true);
            expect(result.size.canProcess).toBe(true);
        });

        test('rejects files exceeding size limit', async () => {
            const content = 'A'.repeat(31 * 1024 * 1024); // 31MB
            const result = await validateFile(content);
            expect(result.canProcess).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('exceeds maximum limit'));
        });
    });

    describe('Encoding Validation', () => {
        test('accepts valid UTF-8 content', async () => {
            const content = 'Hello, 世界!'; // UTF-8 text
            const result = await validateFile(content);
            expect(result.encoding.valid).toBe(true);
            expect(result.encoding.metrics.encoding).toBe('utf-8');
        });

        test('accepts ASCII content', async () => {
            const content = 'Hello, World!'; // ASCII text
            const result = await validateFile(content);
            expect(result.encoding.valid).toBe(true);
            expect(result.encoding.metrics.encoding).toBe('ascii');
        });

        test('rejects content with too many non-printable characters', async () => {
            const content = '\0'.repeat(1000) + 'Hello'; // Many null bytes
            const result = await validateFile(content);
            expect(result.encoding.valid).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('non-printable characters'));
        });
    });

    describe('Content Validation', () => {
        test('validates email format', async () => {
            const emailContent = `
From: sender@example.com
To: recipient@example.com
Subject: Test Email

Hello, this is a test email.
            `.trim();
            
            const result = await validateFile(emailContent, { type: 'email' });
            expect(result.content.valid).toBe(true);
        });

        test('validates OFW format', async () => {
            const ofwContent = `
=== Custody Section ===
Pickup schedule for next week

=== Communication Section ===
Messages from last month
            `.trim();
            
            const result = await validateFile(ofwContent, { type: 'ofw' });
            expect(result.content.valid).toBe(true);
        });

        test('rejects content with too few lines', async () => {
            const content = 'Single line';
            const result = await validateFile(content);
            expect(result.content.valid).toBe(false);
            expect(result.content.error).toContain('too few lines');
        });

        test('warns about long lines', async () => {
            const content = 'A'.repeat(15000) + '\nNormal line';
            const result = await validateFile(content);
            expect(result.warnings).toContain(expect.stringContaining('exceeding maximum length'));
        });
    });

    describe('Security Validation', () => {
        test('detects script injection attempts', async () => {
            const content = 'Normal text <script>alert("xss")</script>';
            const result = await validateFile(content);
            expect(result.security.valid).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('malicious content'));
        });

        test('detects excessive URLs', async () => {
            const content = Array(101).fill('http://example.com').join('\n');
            const result = await validateFile(content);
            expect(result.security.valid).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('too many URLs'));
        });

        test('accepts safe content', async () => {
            const content = 'Normal text with http://example.com link';
            const result = await validateFile(content);
            expect(result.security.valid).toBe(true);
        });
    });

    describe('Quality Validation', () => {
        test('detects low content density', async () => {
            const content = '   '.repeat(1000) + 'sparse content';
            const result = await validateFile(content);
            expect(result.quality.warnings).toContain('Low content density');
        });

        test('detects duplicate content', async () => {
            const line = 'This is a repeated line.\n';
            const content = line.repeat(100);
            const result = await validateFile(content);
            expect(result.quality.warnings).toContain('High percentage of duplicate lines');
        });

        test('detects repeated characters', async () => {
            const content = 'Normal text ' + 'a'.repeat(50) + ' more text';
            const result = await validateFile(content);
            expect(result.quality.warnings).toContain('Contains long sequences of repeated characters');
        });

        test('accepts high-quality content', async () => {
            const content = `
This is a well-formatted document.
It contains multiple unique lines.
The content is properly structured.
Each line adds new information.
            `.trim();
            
            const result = await validateFile(content);
            expect(result.quality.valid).toBe(true);
            expect(result.quality.warnings).toHaveLength(0);
        });
    });

    describe('Format Validation', () => {
        test('validates email headers', async () => {
            const invalidEmail = 'Just some text without email headers';
            const result = await validateFile(invalidEmail, { type: 'email' });
            expect(result.format.valid).toBe(false);
            expect(result.format.error).toContain('Invalid email format');
        });

        test('detects excessive HTML', async () => {
            const content = '<div>'.repeat(2000) + 'text' + '</div>'.repeat(2000);
            const result = await validateFile(content);
            expect(result.format.warnings).toContain('Excessive HTML tags');
        });

        test('accepts valid HTML structure', async () => {
            const content = `
<div>
    <h1>Title</h1>
    <p>Paragraph with <em>emphasis</em>.</p>
</div>
            `.trim();
            
            const result = await validateFile(content);
            expect(result.format.valid).toBe(true);
        });
    });

    describe('Result Formatting', () => {
        test('formats validation results clearly', async () => {
            const content = '<script>alert("xss")</script>\n'.repeat(10);
            const result = await validateFile(content);
            const formatted = formatValidationResult(result);

            expect(formatted).toContain('Errors:');
            expect(formatted).toContain('malicious content');
            expect(formatted).toContain('Validation Details:');
        });

        test('includes warnings in formatted output', async () => {
            const content = '   '.repeat(1000) + 'sparse\n'.repeat(10);
            const result = await validateFile(content);
            const formatted = formatValidationResult(result);

            expect(formatted).toContain('Warnings:');
            expect(formatted).toContain('content density');
        });
    });

    describe('Edge Cases', () => {
        test('handles empty content', async () => {
            const result = await validateFile('');
            expect(result.canProcess).toBe(false);
            expect(result.content.error).toContain('too few lines');
        });

        test('handles null bytes', async () => {
            const content = 'Normal text\0with\0null\0bytes';
            const result = await validateFile(content);
            expect(result.encoding.metrics.nullPercentage).toBeGreaterThan(0);
        });

        test('handles unicode characters', async () => {
            const content = '🌟 Unicode stars ⭐️ and emoji 🎉';
            const result = await validateFile(content);
            expect(result.encoding.metrics.encoding).toBe('utf-8');
            expect(result.encoding.valid).toBe(true);
        });

        test('handles mixed content types', async () => {
            const content = `
From: sender@example.com
To: recipient@example.com
Subject: Mixed Content

<div>Some HTML</div>
=== Section ===
Plain text
            `.trim();
            
            const result = await validateFile(content, { type: 'email' });
            expect(result.canProcess).toBe(true);
        });
    });
});
