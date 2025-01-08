import os
import sys
import subprocess
from pathlib import Path

def log(msg):
    print(f"[LOG] {msg}", flush=True)

def main():
    try:
        # Setup paths
        script_dir = Path(__file__).parent
        input_path = script_dir.parent / 'test-data' / 'OFW_Messages_Report_Dec.pdf'
        output_dir = script_dir.parent / 'test-data' / 'processed'
        llm_input_dir = output_dir / 'llm-input'
        raw_dir = output_dir / 'raw'
        text_path = raw_dir / 'extracted-text.txt'
        
        log(f"Input PDF: {input_path}")
        log(f"Output directory: {output_dir}")
        
        # Verify input file exists
        if not input_path.exists():
            raise FileNotFoundError(f"PDF file not found: {input_path}")
        log("Found input PDF file")
        
        # Create output directories
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(llm_input_dir, exist_ok=True)
        os.makedirs(raw_dir, exist_ok=True)
        log("Created output directories")
        
        # Adobe Reader path
        adobe_path = r"C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe"
        if not os.path.exists(adobe_path):
            adobe_path = r"C:\Program Files\Adobe\Acrobat DC\Acrobat\Acrobat.exe"
        if not os.path.exists(adobe_path):
            raise FileNotFoundError("Adobe Reader/Acrobat not found")
        log(f"Found Adobe at: {adobe_path}")
        
        # Extract text using Adobe
        log("Extracting text with Adobe...")
        cmd = [adobe_path, "/A", f"SaveAs:filename={text_path};format=txt", str(input_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            log("Adobe command output:")
            log(f"STDOUT: {result.stdout}")
            log(f"STDERR: {result.stderr}")
            raise Exception(f"Adobe extraction failed with code {result.returncode}")
        
        # Wait for file to be created
        import time
        max_wait = 30
        while max_wait > 0 and not text_path.exists():
            time.sleep(1)
            max_wait -= 1
        
        if not text_path.exists():
            raise FileNotFoundError("Text file was not created")
        
        # Read extracted text
        log("Reading extracted text...")
        with open(text_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Create chunks
        log("Creating chunks...")
        chunks = []
        current_chunk = ""
        max_size = 100000
        
        for paragraph in text.split('\n\n'):
            if len(current_chunk) + len(paragraph) + 2 > max_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = paragraph
            else:
                current_chunk = f"{current_chunk}\n\n{paragraph}" if current_chunk else paragraph
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        # Save chunks
        log(f"Saving {len(chunks)} chunks...")
        for i, chunk in enumerate(chunks, 1):
            chunk_path = llm_input_dir / f'chunk-{i:03d}.txt'
            with open(chunk_path, 'w', encoding='utf-8') as f:
                f.write(chunk)
        
        log("Processing complete!")
        log(f"- Raw text: {text_path}")
        log(f"- Chunks: {llm_input_dir}")
        
    except Exception as e:
        log(f"ERROR: {str(e)}")
        if hasattr(e, '__traceback__'):
            import traceback
            log("Traceback:")
            log(traceback.format_exc())
        sys.exit(1)

if __name__ == '__main__':
    main()
