import fs from 'fs';

/**
 * Mock PDF processor for testing
 */
export default {
  async extractText(filePath) {
    // Read the actual test file content
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  }
};
