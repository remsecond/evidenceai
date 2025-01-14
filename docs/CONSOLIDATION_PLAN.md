# File Consolidation Plan

## Test Files to Consolidate

### Unit Tests
Move to `test/unit/`:
- test-base-processor.js
- test-pdf-processor.js
- test/unit/llm-scoring.test.js
- test/unit/multi-llm-processor.test.js
- test-attribution-accuracy.js

### Integration Tests
Move to `test/integration/`:
- test-processor-scenarios.js
- test-real-data-processor.js
- test-safeco-scenario.js
- test-multi-source-pipeline.js

### E2E Tests
Move to `test/e2e/`:
- test-full-pipeline.bat
- test-chatgpt-prep.js
- test-timeline-scenario.js

## Server Implementations

### Core Servers
Move to `src/servers/`:
- mission-control-server.js
- pipeline-server.js
- web-server.js
- timeline-server.js

### MCP Servers
Already organized under `src/mcp/`:
- email-processor-server
- google-sheets-server
- pdf-processor-server
- attachment-server

## Service Files

### Processors
Move to `src/processors/`:
- src/services/pdf-processor.js
- src/services/base-processor.js
- src/services/universal-processor.js
- src/services/conversation-processor.js
- src/services/llm-scoring.js
- src/services/multi-llm-processor.js

### Validators
Move to `src/validators/`:
- src/services/validators/temporal-validator.js
- src/services/validators/content-validator.js
- src/services/validators/reference-validator.js
- src/services/attribution-validator.js

### Extractors
Move to `src/extractors/`:
- src/services/extractors/pdf-extractor.js
- src/services/extractors/email-extractor.js
- src/services/extractors/ods-extractor.js
- src/services/extractors/attachment-processor.js

## Web Interface

### Components
Move to `Web/components/`:
- Web/components/llm-comparison.html
- Web/mission-control-*.html

### Styles
Move to `Web/styles/`:
- Web/styles.css

## Scripts

### Process Scripts
Move to `scripts/process/`:
- scripts/process-evidence.js
- scripts/process-ofw-with-pdf.js
- scripts/process-test-data.js

### Utility Scripts
Move to `scripts/utils/`:
- scripts/verify-pipeline.js
- scripts/verify-core-pipeline.js
- scripts/verify-full-pipeline.js
- scripts/debug-pipeline.js

## Next Steps

1. Create consolidation script to automate moves
2. Update import paths in all files
3. Update startup/shutdown scripts
4. Test all components after moves
5. Update documentation references

## Notes

- Keep original files until testing confirms successful moves
- Update all import paths before deleting originals
- Maintain test fixtures in their current locations
- Document any breaking changes
