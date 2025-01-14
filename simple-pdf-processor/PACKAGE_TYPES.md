# Package Type Analysis Implementation

## Core Package Types

### 1. PDF Emails Only
Detection Strategy:
```javascript
function isPdfOnlyPackage(files) {
  // All files are PDFs
  const allPdfs = files.every(file => isPdfFormat(file));
  // All PDFs are emails
  const allEmails = files.every(file => hasEmailMarkers(file));
  return allPdfs && allEmails;
}
```

Processing Path:
- Direct to PDF processor
- Extract email content
- Build email thread structure
- Preserve metadata

### 2. PDF Emails with Record Table
Detection Strategy:
```javascript
function isPdfWithRecordsPackage(files) {
  // Has at least one PDF email
  const hasEmails = files.some(file => isPdfEmail(file));
  // Has exactly one record table
  const recordTables = files.filter(file => isRecordTable(file));
  return hasEmails && recordTables.length === 1;
}
```

Processing Path:
- Split into PDF and record streams
- Cross-validate metadata
- Build relationship map
- Merge context data

### 3. PDF Emails with Other Docs
Detection Strategy:
```javascript
function isPdfWithOthersPackage(files) {
  // Has at least one PDF email
  const hasEmails = files.some(file => isPdfEmail(file));
  // Has other non-record documents
  const hasOthers = files.some(file => 
    !isPdfEmail(file) && !isRecordTable(file));
  return hasEmails && hasOthers;
}
```

Processing Path:
- Identify email documents
- Classify other documents
- Map document relationships
- Preserve full context

## Implementation Priority

1. Package Type Detection
- Implement robust format detection
- Add email content detection
- Add record table detection
- Handle mixed document types

2. Document Classification
- Create document identity system
- Implement classification rules
- Add relationship detection
- Build context mapping

3. Processing Pipeline
- Route to correct processor
- Handle format-specific logic
- Preserve relationships
- Maintain context

This focused approach treats files as first-class citizens while maintaining clear package type boundaries.
