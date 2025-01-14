import EmailProcessor from './dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  try {
    const processor = new EmailProcessor();
    
    // Path to the test email file from fixtures
    const emailPath = path.resolve(__dirname, '../../../simple-pdf-processor/test/fixtures/sample-email.txt');
    
    console.log('Processing email file:', emailPath);
    
    const result = await processor.processEmailFile(
      emailPath,
      'text',
      {
        includeMetadata: true,
        extractAttachments: true,
        parseHeaders: true
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
