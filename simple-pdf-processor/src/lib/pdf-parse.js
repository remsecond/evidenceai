import fs from 'fs';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

async function* streamPages(dataBuffer) {
    // Load PDF document
    const doc = await pdfjsLib.getDocument({
        data: dataBuffer,
        useSystemFonts: true,
        disableFontFace: true
    }).promise;

    // Process pages one at a time
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(' ');
        yield { pageNum: i, text };
    }
}

async function parsePdf(dataBuffer) {
    let text = '';
    let numpages = 0;

    // Stream pages
    for await (const { pageNum, text: pageText } of streamPages(dataBuffer)) {
        text += pageText + '\n\n';
        numpages = pageNum;
    }

    return { text, numpages };
}

export default parsePdf;
