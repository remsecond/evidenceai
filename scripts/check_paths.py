import os
from pathlib import Path

def log(msg):
    print(f"[LOG] {msg}")

def main():
    # Get script directory
    script_dir = Path(__file__).parent
    
    # Check script location
    log(f"Script directory: {script_dir}")
    log(f"Script directory exists: {os.path.exists(script_dir)}")
    
    # Check test-data directory
    test_data_dir = script_dir.parent / 'test-data'
    log(f"\nTest data directory: {test_data_dir}")
    log(f"Test data directory exists: {os.path.exists(test_data_dir)}")
    
    if os.path.exists(test_data_dir):
        log("\nContents of test-data directory:")
        for item in os.listdir(test_data_dir):
            item_path = os.path.join(test_data_dir, item)
            if os.path.isfile(item_path):
                size = os.path.getsize(item_path)
                log(f"- {item} (File, {size:,} bytes)")
            else:
                log(f"- {item} (Directory)")
    
    # Check PDF file
    pdf_path = test_data_dir / 'OFW_Messages_Report_Dec.pdf'
    log(f"\nPDF file: {pdf_path}")
    log(f"PDF file exists: {os.path.exists(pdf_path)}")
    
    if os.path.exists(pdf_path):
        size = os.path.getsize(pdf_path)
        log(f"PDF file size: {size:,} bytes")
        
        # Check if file is readable
        try:
            with open(pdf_path, 'rb') as f:
                header = f.read(4)
                is_pdf = header.startswith(b'%PDF')
                log(f"File starts with PDF header: {is_pdf}")
        except Exception as e:
            log(f"Error reading file: {e}")

if __name__ == '__main__':
    main()
