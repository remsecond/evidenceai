import os
import PyPDF2
from pathlib import Path

def chunk_text(text, max_size=100000):
    chunks = []
    current_chunk = ""
    
    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) + 2 > max_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = paragraph
        else:
            current_chunk = f"{current_chunk}\n\n{paragraph}" if current_chunk else paragraph
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def main():
    # Setup paths
    script_dir = Path(__file__).parent
    input_path = script_dir.parent / 'test-data' / 'OFW_Messages_Report_Dec.pdf'
    output_dir = script_dir.parent / 'test-data' / 'processed'
    llm_input_dir = output_dir / 'llm-input'
    raw_dir = output_dir / 'raw'
    
    # Create directories
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(llm_input_dir, exist_ok=True)
    os.makedirs(raw_dir, exist_ok=True)
    
    print(f'Reading PDF: {input_path}')
    
    # Extract text from PDF
    with open(input_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = '\n\n'.join(page.extract_text() for page in reader.pages)
    
    # Save raw text
    raw_text_path = raw_dir / 'extracted-text.txt'
    with open(raw_text_path, 'w', encoding='utf-8') as file:
        file.write(text)
    print(f'Saved raw text to: {raw_text_path}')
    
    # Create and save chunks
    chunks = chunk_text(text)
    for i, chunk in enumerate(chunks, 1):
        chunk_path = llm_input_dir / f'chunk-{i:03d}.txt'
        with open(chunk_path, 'w', encoding='utf-8') as file:
            file.write(chunk)
    
    print(f'Created {len(chunks)} chunks in: {llm_input_dir}')

if __name__ == '__main__':
    main()
