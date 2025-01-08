import fs from 'fs/promises';
import path from 'path';

async function generateTokenTest() {
    try {
        // Calculate needed characters for 245,988 tokens
        const headerText = `From: test@example.com
To: recipient@example.com
Subject: Token Limit Test (245,988 tokens)
Date: Thu, 14 Dec 2023 10:00:00 -0800

=== Test Document ===

`;

        const footerText = `

=== End of Test Document ===`;

        const headerFooterChars = headerText.length + footerText.length;
        const neededTokens = 245988;
        const neededChars = (neededTokens * 4) - headerFooterChars;
        
        // Generate content
        const content = headerText + 'A'.repeat(neededChars) + footerText;

        // Save to file
        const filePath = path.join('tests', 'fixtures', 'edge_cases', 'token_limit_test.txt');
        await fs.writeFile(filePath, content, 'utf8');

        // Verify size
        const stats = await fs.stat(filePath);
        const finalContent = await fs.readFile(filePath, 'utf8');
        const estimatedTokens = Math.ceil(finalContent.length / 4);

        console.log(`Generated test file: ${filePath}`);
        console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Characters: ${finalContent.length.toLocaleString()}`);
        console.log(`Estimated Tokens: ${estimatedTokens.toLocaleString()}`);

        if (estimatedTokens !== neededTokens) {
            console.warn(`Warning: Token count mismatch!`);
            console.warn(`Expected: ${neededTokens.toLocaleString()}`);
            console.warn(`Actual: ${estimatedTokens.toLocaleString()}`);
            console.warn(`Difference: ${Math.abs(neededTokens - estimatedTokens).toLocaleString()}`);
        }

        // Save metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            file: {
                name: path.basename(filePath),
                size: stats.size,
                characters: finalContent.length,
                estimated_tokens: estimatedTokens,
                target_tokens: neededTokens
            }
        };

        const metadataPath = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, '.txt')}_meta.json`
        );
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        console.log(`\nMetadata saved to: ${metadataPath}`);

    } catch (error) {
        console.error('Error generating test file:', error);
        process.exit(1);
    }
}

generateTokenTest();
