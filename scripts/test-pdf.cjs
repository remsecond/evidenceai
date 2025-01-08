const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

console.error('Starting pdf2json test...');
console.error('Current directory:', process.cwd());
console.error('Script location:', __filename);
console.error('Node version:', process.version);

try {
    console.error('\nCreating parser...');
    const parser = new PDFParser();
    console.error('Parser created');
    
    console.error('\nSetting up event handlers...');
    parser.on('pdfParser_dataReady', (data) => {
        console.error('Data ready:', Object.keys(data));
        console.error('Pages:', data.Pages?.length);
        console.error('Meta:', data.Meta);
        console.error('Version:', data.Version);
        if (data.Pages?.[0]?.Texts) {
            console.error('First page text count:', data.Pages[0].Texts.length);
            const firstPageText = data.Pages[0].Texts
                .map(text => decodeURIComponent(text.R[0].T))
                .join(' ');
            console.error('First page text:', firstPageText.substring(0, 200) + '...');
        }
    });
    
    parser.on('pdfParser_dataError', (error) => {
        console.error('Parse error:', error);
    });

    parser.on('readable', () => {
        console.error('Parser is readable');
    });

    parser.on('error', (error) => {
        console.error('Parser error:', error);
    });
    
    console.error('\nReading PDF file...');
    const pdfPath = path.resolve(process.cwd(), 'test-data', 'OFW_Messages_Report_Dec.pdf');
    console.error('PDF path:', pdfPath);
    
    if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF not found at ${pdfPath}`);
    }
    
    const buffer = fs.readFileSync(pdfPath);
    console.error('Read', buffer.length, 'bytes');
    
    console.error('\nParsing PDF...');
    parser.parseBuffer(buffer);
    
} catch (error) {
    console.error('\nERROR:');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
