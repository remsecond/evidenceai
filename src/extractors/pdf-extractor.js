const fs = require('fs').promises;
const pdf = require('pdf-parse');

class PDFExtractor {
    async extractText(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } catch (error) {
            console.error(`Error extracting PDF text from ${filePath}:`, error.message);
            throw error;
        }
    }
}

module.exports = { PDFExtractor };
