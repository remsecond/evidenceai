import fs from 'fs';
import path from 'path';

// Create a test file that will hit our target token sizes
async function generateTokenTest() {
    // Target around 245,988 tokens (≈ 983,952 characters)
    const targetChars = 983952;
    
    // Base content
    const header = `=== Test Document ===
From: test@example.com
To: recipient@example.com
Subject: Token Limit Test Document
Date: 2024-01-20T10:00:00Z

SECTION 1: Introduction
======================
This is a test document designed to verify the chunking implementation.
The document contains multiple sections with varied content to test
section preservation and boundary handling.

`;

    const section2Start = `
SECTION 2: Large Content Block
=============================
`;

    const section3Start = `
SECTION 3: Important Headers
===========================
SUBSECTION A: Critical Information
--------------------------------
This section tests preservation of headers and subheaders across chunk boundaries.
`;

    const section3B = `
SUBSECTION B: Additional Details
------------------------------
Testing nested section handling and metadata preservation.
`;

    const section4 = `
SECTION 4: Special Cases
=======================
NOTES:
- Important point that should be preserved
- Another critical point for testing
- Verification of list handling
`;

    const footer = `
=== End of Test Document ===`;

    // Calculate how many repeats we need
    const baseLength = header.length + section2Start.length + section3Start.length + 
                      section3B.length + section4.length + footer.length;
    const remainingChars = targetChars - baseLength;
    
    // Split remaining chars between sections
    const section2Text = 'This is a large block of repeating text that should force chunking. '.repeat(
        Math.floor(remainingChars * 0.4 / 'This is a large block of repeating text that should force chunking. '.length)
    );
    
    const section3AText = 'More content to ensure this crosses chunk boundaries. '.repeat(
        Math.floor(remainingChars * 0.3 / 'More content to ensure this crosses chunk boundaries. '.length)
    );
    
    const section3BText = 'Additional content to force more chunk boundaries. '.repeat(
        Math.floor(remainingChars * 0.2 / 'Additional content to force more chunk boundaries. '.length)
    );
    
    const section4Text = 'Content to push this section across chunks. '.repeat(
        Math.floor(remainingChars * 0.1 / 'Content to push this section across chunks. '.length)
    );

    // Combine all content
    const content = header +
        section2Start + section2Text +
        section3Start + section3AText +
        section3B + section3BText +
        section4 + section4Text +
        footer;

    // Ensure directory exists
    const dir = path.join('tests', 'fixtures', 'edge_cases');
    await fs.promises.mkdir(dir, { recursive: true });

    // Write file
    const filePath = path.join(dir, 'token_limit_test.txt');
    await fs.promises.writeFile(filePath, content, 'utf8');

    // Log stats
    console.log('Test file generated:');
    console.log('Total characters:', content.length);
    console.log('Estimated tokens:', Math.ceil(content.length / 4));
    console.log('File saved to:', filePath);
}

generateTokenTest().catch(console.error);
