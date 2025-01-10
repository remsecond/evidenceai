# Understanding File Relationships in Document Processing

## The Story Each File Tells

### 1. extracted-text.txt
This is your "source of truth" - the complete, raw document exactly as it was extracted. Think of it as a perfect photocopy of the original document, preserving every word and formatting detail. This file answers the question "What exactly was in the original document?"

### 2. chunk-[n].json
These are your "smart summaries" - the document broken into meaningful pieces that preserve context and relationships. Each chunk contains:
```json
{
  "text": "The actual content",
  "metadata": {
    "type": "What kind of section this is",
    "section": "Which part of the document",
    "position": "Where in the sequence",
    "continues": "Whether it flows into next chunk"
  }
}
```
These files answer "How does this document break down into meaningful parts?"

### 3. processing-report.json
This is your "processing story" - everything that happened during document analysis:
```json
{
  "document_info": {
    "filename": "Original file",
    "size": "How big it was",
    "pages": "Number of pages",
    "total_tokens": "Size in tokens"
  },
  "processing_stats": {
    "tools_used": "What analyzed it",
    "success_rate": "How well it worked",
    "quality_score": "How good the results are"
  }
}
```
This file answers "What happened when we processed this document?"

### 4. success.log
This is your "receipt" - confirmation that everything completed successfully. It's like a signature saying "Yes, this document was fully processed."

## How They Work Together

### Primary Keys
1. **Processing Run ID**: The timestamp in the directory name (e.g., "2025-01-09T09-25-31-976Z")
   - This uniquely identifies each processing run
   - Links all files from the same processing session
   - Allows tracking document versions

2. **Document ID**: Found in processing-report.json
   - Uniquely identifies the source document
   - Links to the original file
   - Connects with external systems

3. **Chunk IDs**: The numbers in chunk-[n].json
   - Shows how pieces fit together
   - Maintains document flow
   - Preserves relationships between sections

### Example Story Flow

Let's say you're investigating a document:

1. Start with **processing-report.json**
   - See it's a 358-page PDF
   - Processed with Adobe Extract + PyMuPDF
   - High quality score (98%)

2. Look at **extracted-text.txt**
   - Verify complete extraction
   - Confirm document integrity
   - See full context

3. Examine **chunk-[n].json** files
   - Each chunk shows its context
   - Metadata reveals structure
   - Position numbers show flow

4. Check **success.log**
   - Confirm complete processing
   - Verify no errors
   - Validate results

### Real-World Example

For a legal document:
```
ai-outputs/deepseek/2025-01-09T09-25-31-976Z/
├── chunk-1.json         # Introduction and parties
├── chunk-2.json         # Terms and conditions
├── chunk-3.json         # Obligations section
├── extracted-text.txt   # Complete legal document
├── processing-report.json # Processing details
└── success.log         # Completion confirmation
```

The files tell us:
- What's in the document (extracted-text.txt)
- How it's structured (chunk-[n].json)
- How it was processed (processing-report.json)
- That processing succeeded (success.log)

### Role-Specific Usage

#### Librarian
- Uses processing-report.json for cataloging
- Relies on chunk metadata for organization
- References success.log for verification

#### Detective
- Analyzes chunk-[n].json for patterns
- Cross-references extracted-text.txt
- Uses metadata for context

#### Oracle
- Combines all files for insights
- Links related documents
- Builds comprehensive view

## Best Practices

1. Always start with processing-report.json
   - Understand what you're working with
   - Check quality scores
   - Verify processing success

2. Use extracted-text.txt for verification
   - Confirm accuracy
   - Check context
   - Resolve questions

3. Work with chunks for analysis
   - Follow the sequence
   - Note relationships
   - Maintain context

4. Reference success.log when needed
   - Verify completion
   - Check for issues
   - Validate process
