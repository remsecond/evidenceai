import os
import sys
from datetime import datetime

def check_environment():
    """Check if required packages are installed."""
    try:
        import PyPDF2
        import pdfminer
        import tqdm
        print("✓ Required packages found")
        return True
    except ImportError as e:
        print(f"ERROR: Missing package - {str(e)}")
        return False

def check_directories():
    """Check if required directories exist."""
    required_dirs = [
        'input', 'input/pdf', 'input/ofw', 'input/ods', 'input/email', 'input/word',
        'processed', 'processed/pdf', 'processed/ofw', 'processed/ods', 'processed/email', 'processed/word',
        'staging', 'logs', 'src/preprocessing'
    ]
    
    missing = []
    for d in required_dirs:
        if not os.path.exists(d):
            missing.append(d)
    
    if missing:
        print("ERROR: Missing directories:")
        for d in missing:
            print(f"  - {d}")
        return False
        
    print("✓ Required directories found")
    return True

def main():
    """Main entry point."""
    print("\nEvidenceAI Document Processor")
    print("=" * 30)
    
    # Check environment
    if not check_environment():
        print("\nPlease run setup-phase2.bat to install required packages")
        return
        
    # Check directories
    if not check_directories():
        print("\nPlease run setup-phase2.bat to create required directories")
        return
    
    # Check for input files
    input_files = []
    for root, _, files in os.walk('input'):
        for file in files:
            if not file.startswith('.'):
                input_files.append(os.path.join(root, file))
    
    if not input_files:
        print("\nNo files found to process.")
        print("Add files to the input directory with format:")
        print("- OFW_Messages_Report_YYYY-MM-DD_HH-MM-SS.pdf")
        print("- Email exchange with user@domain.com after YYYY-MM-DD before YYYY-MM-DD.pdf")
        print("- label Emails from user@domain.com after YYYY-MM-DD before YYYY-MM-DD.ods")
        return
    
    print(f"\nFound {len(input_files)} files to process:")
    for f in input_files:
        print(f"  - {os.path.basename(f)}")
    
    # Create timestamp for this run
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join('logs', f'processing_{timestamp}.log')
    
    print(f"\nLogging to: {log_file}")
    print("\nEnvironment check complete. Ready to process files.")
    print("(Full processing will be implemented in next phase)")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nProcessing interrupted by user.")
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
    finally:
        print("\nPress Enter to exit...")
        input()
