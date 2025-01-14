# Project Cleanup Plan

## 1. Scripts Consolidation

### PDF Processing Scripts
Current redundant scripts to consolidate:
- adobe_extract.py
- fitz_extract.py
- pdf_extract.py
- pdfminer_extract.py
- pike_extract.py
- tika_extract.py
- pdf-check.js
- pdf2txt.bat

Consolidate into:
- `scripts/utils/pdf-extract.js` - Main PDF processing utility
- `scripts/utils/pdf-validate.js` - PDF validation utility

### Test Scripts
Current scattered test files:
- test-*.js files (multiple)
- *-test.js files
- simple-test.cjs
- test-and-save.js

Consolidate into:
- `test/unit/` - Unit tests
- `test/integration/` - Integration tests
- `test/e2e/` - End-to-end tests

### Process Scripts
Current overlapping process scripts:
- process-ofw-complete.js
- process-ofw-now.js
- process-ofw-simple.js
- process-ofw-with-pdf.js
- process-real-data.js
- process-test-data.js

Consolidate into:
- `scripts/process/ofw-processor.js` - Main OFW processing
- `scripts/process/batch-processor.js` - Batch processing utility

### Server Scripts
Current server implementations:
- mission-control-server.js
- pipeline-server.js
- simple-pipeline-server.js
- test-server.js
- timeline-server.js
- web-server.js

Consolidate into:
- `src/servers/` directory with clear separation of concerns

## 2. Documentation Organization

### Current State Documents
Consolidate these into a single source of truth:
- CURRENT_STATE.md
- CHECKPOINT.md
- SESSION_CHECKPOINT_*.md
- COMMIT_MSG.txt

### Architecture Documentation
Organize under `docs/architecture/`:
- COMPREHENSIVE_SYSTEM_DESIGN.md
- ENHANCED_PDF_PIPELINE.md
- EVIDENCE_CHAIN_ARCHITECTURE.md
- FINAL_ARCHITECTURE.md

### Process Documentation
Organize under `docs/processes/`:
- PROCESSING_APPROACHES.md
- PIPELINE_IMPROVEMENTS.md
- PIPELINE_DEBUG.md
- TESTING_GUIDE.md

### Vision & Strategy
Organize under `docs/strategy/`:
- PRODUCT_STRATEGY.md
- TAGSPACE_VISION.md
- EVOLUTION_VISION.md
- LENS_CONCEPT.md

## 3. Code Organization

### Source Code
Restructure under `src/`:
- `src/processors/` - All processor implementations
- `src/validators/` - Validation logic
- `src/extractors/` - Extraction utilities
- `src/services/` - Core services
- `src/utils/` - Shared utilities

### Test Code
Restructure under `test/`:
- `test/unit/` - Unit tests
- `test/integration/` - Integration tests
- `test/e2e/` - End-to-end tests
- `test/fixtures/` - Test data and mocks

### MCP Servers
Consolidate under `src/mcp/`:
- email-processor-server
- google-sheets-server
- pdf-processor-server
- attachment-server

## 4. Configuration Files
Consolidate configuration:
- Move all .env files to config/
- Standardize configuration format
- Create clear examples and documentation

## 5. Web Interface
Organize under `Web/`:
- Consolidate duplicate HTML files
- Standardize component structure
- Create shared styles directory

## 6. Cleanup Steps

### Phase 1: Documentation
1. Create new documentation structure
2. Move and merge existing docs
3. Update cross-references
4. Remove obsolete files

### Phase 2: Scripts
1. Create new script directories
2. Consolidate redundant scripts
3. Update import paths
4. Remove deprecated scripts

### Phase 3: Source Code
1. Create new source structure
2. Move files to appropriate locations
3. Update import paths
4. Remove duplicate implementations

### Phase 4: Tests
1. Create new test structure
2. Organize test files
3. Update test configurations
4. Remove redundant tests

### Phase 5: Configuration
1. Standardize configuration
2. Update environment variables
3. Create comprehensive examples
4. Remove obsolete configs

## 7. Validation Steps

After each phase:
1. Run all tests
2. Verify functionality
3. Update documentation
4. Commit changes

## 8. Future Maintenance

### Documentation Standards
- Keep single source of truth for current state
- Maintain clear architecture documentation
- Regular cleanup of obsolete docs

### Code Standards
- Clear directory structure
- Consistent naming conventions
- Regular dependency updates
- Automated testing

### Process Standards
- Regular code reviews
- Documentation updates
- Dependency audits
- Performance monitoring
