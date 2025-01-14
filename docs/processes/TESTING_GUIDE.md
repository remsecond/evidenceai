# Testing the Evidence Pipeline

## Quick Test

The fastest way to test the pipeline is:

1. Run test-full-pipeline.bat
   ```
   test-full-pipeline.bat
   ```
   This will:
   - Copy sample test files to uploads/
   - Start the pipeline monitor
   - Trigger processing
   - Open the monitor in your browser

2. Watch the progress in your browser:
   - See each stage complete
   - Monitor validation results
   - View generated files

3. When complete, check these locations:
   ```
   processed/chatgpt-input/  # Generated analysis files
   processed/analysis/       # Analysis templates
   ```

4. Stop the servers:
   ```
   stop-pipeline-monitor.bat
   ```

## Manual Testing

If you want to test specific components:

1. Start the monitor:
   ```
   start-pipeline-monitor.bat
   ```

2. Add your own test files to uploads/:
   - PDF documents
   - Email exports
   - Record files

3. Trigger processing via API:
   ```
   curl -X POST http://localhost:3000/process
   ```

4. Monitor progress at:
   ```
   http://localhost:3000/pipeline-monitor.html
   ```

## What to Look For

1. Processing Stages
   - PDF extraction completes
   - Email processing works
   - Records are integrated
   - Data is validated

2. Generated Files
   - Timeline data is structured
   - Relationships are mapped
   - Validation scores look reasonable

3. Analysis Templates
   - Report template is ready
   - Findings structure is correct
   - Review checklist is complete

4. Common Issues
   - Server startup failures
   - File access errors
   - Processing timeouts
   - Missing dependencies

## Test Files

Sample test files are in:
```
simple-pdf-processor/test/fixtures/
├── sample-ofw.txt       # OFW messages
├── sample-email.txt     # Email data
├── sample-records.json  # Structured records
└── sample-records.csv   # Timeline data
```

## Validation

The pipeline performs these checks:

1. Temporal Validation
   - Event sequence
   - Timeline consistency
   - Date formatting

2. Content Validation
   - Data structure
   - Required fields
   - Format compliance

3. Reference Validation
   - Cross-references
   - Entity links
   - Document citations

## Expected Output

After successful processing:

1. Timeline Data (1-timeline.json)
   - Chronological events
   - Participant actions
   - Source references

2. Relationship Data (2-relationships.json)
   - Entity connections
   - Interaction patterns
   - Group structures

3. Validation Results (3-validation.json)
   - Quality scores
   - Issue reports
   - Confidence levels

## Troubleshooting

1. Server Issues
   - Check Node.js is installed
   - Verify ports are available
   - Check file permissions

2. Processing Errors
   - Review server logs
   - Check file formats
   - Verify file access

3. Monitor Problems
   - Clear browser cache
   - Check JavaScript console
   - Verify network connection

## Clean Up

After testing:

1. Stop servers:
   ```
   stop-pipeline-monitor.bat
   ```

2. Review outputs:
   ```
   processed/
   ├── chatgpt-input/  # Generated files
   └── analysis/       # Templates
   ```

3. Optional cleanup:
   ```
   rmdir /s /q uploads processed
