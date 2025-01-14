import EmailProcessor from './index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  try {
    const processor = new EmailProcessor();
    
    // Path to the test email PDF file
    const emailPdfPath = path.resolve(__dirname, '../../../../input/Email exchange with christinemoyer_hotmail.com after 2024-10-31 before 2025-01-12.pdf');
    
    console.log('Processing email PDF:', emailPdfPath);
    
    const result = await processor.processEmailFile(
      emailPdfPath,
      'pdf',
      {
        includeMetadata: true,
        extractAttachments: true
      }
    );
    
    console.log('Successfully processed email:');
    console.log(JSON.stringify(result, null, 2));
    
    // Basic validation
    if (!result.body) {
      throw new Error('No email body extracted');
    }
    
    console.log('\nExtracted text length:', result.body.length);
    console.log('First 500 characters of extracted text:');
    console.log(result.body.substring(0, 500));
    
    if (result.metadata) {
      console.log('\nExtracted metadata:', result.metadata);
    }
    
    if (result.attachments && result.attachments.length > 0) {
      console.log('\nFound attachments:', result.attachments.map(a => a.filename));
    }
    
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

runTest();
