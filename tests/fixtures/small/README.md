# Test Fixtures

This directory contains test data organized by category:

- `small/` - Files under 150k tokens
- `medium/` - Files between 150k-500k tokens  
- `large/` - Files over 500k tokens
- `emails/` - Email-specific test files
- `ofw/` - OFW-specific test files
- `edge_cases/` - Edge case test files
- `invalid/` - Invalid test files that should fail

Each test file has an accompanying metadata JSON file with details about:
- Token count
- File size
- Category
- Processing requirements
- Expected validation results
