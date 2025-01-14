# Reversion Plan

## Files to Revert

1. src/services/extractors/pdf-extractor.js
- Revert timestamp parsing changes
- Restore original file handling logic

2. src/services/universal-processor.js  
- Revert file type detection changes
- Restore original source type handling

## Steps

1. Checkout Previous Stable Version
- Use git to revert to last known stable commit
- Verify file states match expected versions
- Run `verify-core-pipeline.bat` to validate core functionality

2. Automated Verification
- Run `verify-core-pipeline.bat` which checks:
  - Required files and services
  - Core pipeline functionality
  - Google integration
  - Document processing
  - Test suite execution

3. Documentation Updates
- Note current limitations with email processing
- Document known issues for future reference
- Update testing requirements

## Post-Reversion Tasks

1. Testing
- Run full test suite
- Verify core functionality
- Document any remaining issues

2. Documentation
- Update status documentation
- Note known limitations
- Document reversion decision

3. Next Steps
- Follow improvement plan
- Focus on stability first
- Plan incremental improvements
