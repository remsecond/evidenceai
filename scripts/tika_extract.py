import os
import sys
from pathlib import Path
from tika import parser
import re

def log(msg):
    print(f"[LOG] {msg}", flush=True)

def chunk_text(text, max_size=100000):
    chunks = []
    current_chunk = ""
    
    # Split into paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    
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
    try:
        # Setup paths using absolute paths
        script_dir = Path(__file__).resolve().parent
        input_path = script_dir.parent / 'test-data' / 'OFW_Messages_Report_Dec.pdf'
        output_dir = script_dir.parent / 'test-data' / 'processed'
        llm_input_dir = output_dir / 'llm-input'
        raw_dir = output_dir / 'raw'
        text_path = raw_dir / 'extracted-text.txt'
        
        # Print paths for debugging
        log(f"Current working directory: {os.getcwd()}")
        log(f"Script directory (absolute): {script_dir}")
        log(f"Input PDF (absolute): {input_path.resolve()}")
        log(f"Output directory (absolute): {output_dir.resolve()}")
        
        # Verify input file exists
        if not input_path.exists():
            raise FileNotFoundError(f"PDF file not found: {input_path}")
        log("Found input PDF file")
        
        # Create output directories
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(llm_input_dir, exist_ok=True)
        os.makedirs(raw_dir, exist_ok=True)
        log("Created output directories")
        
        # Extract text using Apache Tika
        log("Extracting text from PDF...")
        parsed = parser.from_file(str(input_path.resolve()))
        if not parsed.get('content'):
            raise Exception("Failed to extract text from PDF")
        
        full_text = parsed['content']
        log("Text extraction complete")
        
        # Save raw text
        log("Saving raw text...")
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(full_text)
        log(f"Raw text saved to: {text_path}")
        
        # Create chunks
        log("Creating chunks...")
        chunks = chunk_text(full_text)
        
        # Save chunks
        log(f"Saving {len(chunks)} chunks...")
        for i, chunk in enumerate(chunks, 1):
            chunk_path = llm_input_dir / f'chunk-{i:03d}.txt'
            with open(chunk_path, 'w', encoding='utf-8') as f:
                f.write(chunk)
        
        log("Processing complete!")
        log(f"- Raw text: {text_path}")
        log(f"- Created {len(chunks)} chunks in: {llm_input_dir}")
        
    except Exception as e:
        log(f"ERROR: {str(e)}")
        import traceback
        log("Traceback:")
        log(traceback.format_exc())
        sys.exit(1)

if __name__ == '__main__':
    main()
