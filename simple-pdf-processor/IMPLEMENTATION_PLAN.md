# Companion File Detection Implementation Plan

## 1. File Detection Module
### New File: src/services/companion-detector.js
```javascript
// Planned structure
class CompanionDetector {
  detectCompanionFiles(filePath) {
    // Detect PDF/ODS pairs
  }
  
  validatePair(pdfPath, odsPath) {
    // Validate matching files
  }
}
```

## 2. Implementation Phases

### Phase 1: Basic Detection
- [ ] Implement file name pattern matching
- [ ] Create test fixtures with companion pairs
- [ ] Add detection methods for PDF->ODS lookup
- [ ] Add detection methods for ODS->PDF lookup

### Phase 2: Format Validation
- [ ] Add MIME type checking
- [ ] Validate file structure
- [ ] Handle malformed files
- [ ] Add format-specific validation

### Phase 3: Cross-Validation
- [ ] Extract key fields from both formats
- [ ] Implement field comparison logic
- [ ] Add validation reporting
- [ ] Handle validation mismatches

## 3. Test Plan

### Unit Tests
```javascript
// test/companion-detector.test.js
describe('CompanionDetector', () => {
  it('should detect companion files')
  it('should validate file pairs')
  it('should handle missing companions')
  it('should report validation results')
})
```

### Integration Tests
- Test with real CloudHQ exports
- Verify detection in upload flow
- Test validation reporting
- Test error handling

## 4. API Design

### Detection API
```javascript
// Example usage
const detector = new CompanionDetector();
const result = await detector.detectCompanionFiles('path/to/file.pdf');
// Returns: { companion: 'path/to/file.ods', validated: true }
```

### Validation API
```javascript
// Example usage
const validation = await detector.validatePair(pdfPath, odsPath);
// Returns: { matches: true, fields: { matched: [], mismatched: [] } }
```

## 5. Implementation Order

1. Core Detection
- [ ] Create CompanionDetector class
- [ ] Implement basic file pattern matching
- [ ] Add unit tests
- [ ] Test with sample files

2. Format Validation
- [ ] Add format-specific validators
- [ ] Implement MIME type checking
- [ ] Add validation tests
- [ ] Test with malformed files

3. Cross-Validation
- [ ] Implement field extraction
- [ ] Add comparison logic
- [ ] Create validation reports
- [ ] Test with real data

4. Integration
- [ ] Add to upload flow
- [ ] Update web interface
- [ ] Add error handling
- [ ] Test end-to-end

## 6. Success Criteria

1. Detection Accuracy
- 100% detection of valid companions
- No false positives
- Clear error messages

2. Validation Quality
- Field-level validation
- Detailed mismatch reporting
- Performance within limits

3. Integration
- Seamless upload flow
- Clear user feedback
- Error recovery

## 7. Future Enhancements

1. Performance Optimizations
- Caching of results
- Parallel processing
- Batch operations

2. Extended Features
- Support for other formats
- Advanced validation rules
- Custom matching patterns

3. User Interface
- Visual companion indicators
- Interactive validation reports
- Batch processing interface

Ready to begin with Phase 1: Basic Detection upon approval.
