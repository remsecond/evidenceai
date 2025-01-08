import os
import sys
import subprocess
from pathlib import Path
import time
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
        
        # Find Adobe Reader/Acrobat
        adobe_paths = [
            r"C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe",
            r"C:\Program Files\Adobe\Acrobat DC\Acrobat\Acrobat.exe"
        ]
        adobe_path = None
        for path in adobe_paths:
            if os.path.exists(path):
                adobe_path = path
                break
        
        if not adobe_path:
            raise FileNotFoundError("Adobe Reader/Acrobat not found")
        log(f"Found Adobe at: {adobe_path}")
        
        # Extract text using Adobe's CLI
        log("Extracting text from PDF...")
        cmd = [adobe_path, "/A", f"SaveAs:filename={text_path};format=txt", str(input_path)]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                log("Adobe command output:")
                log(f"STDOUT: {result.stdout}")
                log(f"STDERR: {result.stderr}")
                raise Exception(f"Adobe extraction failed with code {result.returncode}")
        except subprocess.TimeoutExpired:
            log("Adobe command timed out after 60 seconds")
            raise
        
        # Wait for file to be created
        max_wait = 30
        while max_wait > 0 and not text_path.exists():
            time.sleep(1)
            max_wait -= 1
            log(f"Waiting for text file... ({max_wait} seconds left)")
        
        if not text_path.exists():
            raise FileNotFoundError("Text file was not created")
        
        # Read extracted text
        log("Reading extracted text...")
        with open(text_path, 'r', encoding='utf-8') as f:
            full_text = f.read()
        
        if not full_text.strip():
            raise Exception("Extracted text is empty")
        
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
