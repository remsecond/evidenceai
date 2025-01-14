# Pipeline Debug Guide

## Quick Test

Run the debug script to test the pipeline:
```
debug-pipeline.bat
```

This will:
1. Clean up any existing processes
2. Create required directories
3. Copy test files
4. Start pipeline server in debug mode
5. Test server connection
6. Test file processing
7. Check output files

## Common Issues

### "Failed to start pipeline" Error

If you see this in Mission Control:
1. Check if another server is running:
   ```
   tasklist | findstr "node.exe"
   ```
2. Kill existing processes:
   ```
   taskkill /F /IM node.exe
   ```
3. Try starting Mission Control again

### Missing Output Files

If pipeline runs but no files appear:
1. Check uploads/ directory has test files
2. Verify processed/pipeline/ exists
3. Look for errors in Chrome DevTools:
   - Go to chrome://inspect
   - Click "Open dedicated DevTools for Node"
   - Check console for errors

### Server Connection Issues

If server won't start:
1. Verify port 3000 is free:
   ```
   netstat -ano | findstr :3000
   ```
2. Kill process if needed:
   ```
   taskkill /F /PID <process_id>
   ```

## Directory Structure

```
evidenceai/
├── uploads/              # Input files
│   ├── test-ofw.txt
│   ├── test-email.txt
│   ├── test-records.json
│   └── test-records.csv
│
├── processed/           # Output files
│   └── pipeline/
│       ├── timeline.json
│       ├── relationships.json
│       └── validation.json
```

## Test Files

Sample test files are copied from:
```
simple-pdf-processor/test/fixtures/
```

These provide basic test data for:
- OFW messages
- Email content
- Record data
- Timeline entries

## Debug Mode

When running in debug mode:
1. Server starts with --inspect flag
2. Chrome DevTools shows Node process
3. Console displays detailed logs
4. Network tab shows API calls

## Clean Up

After testing:
1. Stop debug server (press any key)
2. Verify node processes are killed
3. Check processed/ for output files
4. Review any error messages

## Next Steps

Once pipeline is working:
1. Test in Mission Control
2. Prepare LLM analysis
3. Review generated files
4. Start ChatGPT integration
