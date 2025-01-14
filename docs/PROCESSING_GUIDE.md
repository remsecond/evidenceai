# Document Processing Guide

## File Organization

Place your files in these directories:

1. `input/pdf/`
   - PDF documents and reports
   - OFW message reports (.pdf)
   - Scanned documents

2. `input/ofw/`
   - OFW message exports (.txt)
   - OFW message threads
   - OFW communication records

3. `input/ods/`
   - ODS spreadsheets
   - Email label exports (.ods)
   - Data exports

4. `input/email/`
   - Non-OFW email exports
   - Regular email threads
   - Email archives

5. `input/word/`
   - Word documents
   - Text documents
   - Reports and memos

## Processing Steps

1. **Setup**
   - Run `setup-phase2.bat` to set up Python environment
   - This installs required packages:
     * PyPDF2 for PDF processing
     * pdfminer.six for complex PDFs
     * Other dependencies

2. **Add Files**
   - Place files in appropriate input directories
   - System automatically creates needed directories
   - Maintains original file organization

3. **Run Processing**
   - Execute `process_docs.bat`
   - Shows directory structure
   - Waits for your confirmation

4. **Monitor Progress**
   - Watch real-time processing
   - See correlation discoveries
   - Track processing statistics

5. **Check Results**
   - Processed files move to `processed/` directory
   - Logs saved in `logs/` directory
   - Google Sheets update automatically

## Output Locations

- `processed/` - Successfully processed files
- `logs/` - Processing logs and correlations
- `archive/` - Files with processing errors
- Google Sheets - Live tracking and analysis

## Features

1. **Enhanced PDF Processing**
   - Primary extraction with PyPDF2
   - Fallback to pdfminer.six
   - Metadata extraction

2. **OFW Processing**
   - Message content extraction
   - Date and sender metadata
   - Thread correlation

3. **Correlation System**
   - Cross-document matching
   - Confidence scoring
   - Cluster formation

4. **Live Tracking**
   - Google Sheets integration
   - Real-time updates
   - Processing statistics

## Troubleshooting

1. **File Errors**
   - Check file permissions
   - Verify file format
   - Look in archive/ for failed files

2. **Processing Issues**
   - Check logs for details
   - Verify Python environment
   - Ensure correct file placement

3. **Correlation Problems**
   - Review confidence settings
   - Check file content quality
   - Verify file relationships

## Best Practices

1. **File Organization**
   - Use correct input directories
   - Maintain file extensions
   - Keep original names

2. **Processing**
   - Process related files together
   - Monitor correlations
   - Review logs regularly

3. **Maintenance**
   - Clear processed/ periodically
   - Archive old logs
   - Update Python packages
