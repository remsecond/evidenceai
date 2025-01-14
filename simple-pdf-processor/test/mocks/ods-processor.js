import fs from 'fs';

/**
 * Mock ODS processor for testing
 */
export default {
  async extractHeaders(filePath) {
    // Read the actual test file content
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  },

  async extractContent(filePath) {
    // Read the actual test file content
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  }
};
