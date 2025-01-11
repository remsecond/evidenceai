# EvidenceAI Output Definition

## Directory Structure
```
ai-outputs/
├── [model]/                    # Model-specific outputs (claude, deepseek, gpt4, etc.)
    └── [processing-run]/       # Timestamped processing run
        ├── chunk-[n].json      # Numbered content chunks
        ├── extracted-text.txt  # Full extracted text
        ├── processing-report.json # Processing metadata and stats
        └── success.log        # Processing success confirmation
```

## Output Files

### chunk-[n].json
```json
{
  "text": "string",            // Chunk content
  "metadata": {
    "type": "string",          // e.g., "partial_section"
    "section": "string",       // Section identifier
    "position": number,        // Position in sequence
    "continues": boolean,      // Whether chunk continues
    "total_chunks": number     // Total chunks in document
  },
  "estimated_tokens": number   // Estimated token count
}
```

### processing-report.json
```json
{
  "document_info": {
    "filename": "string",
    "size_bytes": number,
    "pages": number,
    "total_tokens": number
  },
  "processing_stats": {
    "start_time": "ISO-8601",
    "end_time": "ISO-8601",
    "duration_ms": number,
    "chunks_created": number,
    "total_tokens_processed": number
  },
  "extraction_details": {
    "tools_used": ["string"],  // e.g., ["adobe", "fitz", "pdfminer"]
    "success_rate": number,
    "quality_score": number
  }
}
```

## Role-Specific Optimizations

### Librarian Role
```javascript
// Document organization optimizations
const librarianOptimizations = {
  metadata: {
    // Enhanced metadata extraction
    document_type: "string",     // Document classification
    date_range: {
      start: "ISO-8601",
      end: "ISO-8601"
    },
    participants: ["string"],    // Key people mentioned
    topics: ["string"],         // Main topics
    priority: number            // Document importance
  },
  organization: {
    // Improved categorization
    categories: ["string"],     // Document categories
    tags: ["string"],          // Relevant tags
    cross_references: ["string"] // Related documents
  }
}
```

### Detective Role
```javascript
// Analysis optimizations
const detectiveOptimizations = {
  analysis: {
    // Enhanced pattern detection
    patterns: [{
      type: "string",          // Pattern type
      frequency: number,       // Occurrence frequency
      context: "string",       // Surrounding context
      confidence: number      // Detection confidence
    }],
    relationships: [{
      type: "string",         // Relationship type
      entities: ["string"],   // Related entities
      strength: number       // Relationship strength
    }],
    anomalies: [{
      type: "string",        // Anomaly type
      severity: number,      // Issue severity
      context: "string"      // Relevant context
    }]
  }
}
```

### Oracle Role
```javascript
// Insight generation optimizations
const oracleOptimizations = {
  insights: {
    // Enhanced understanding
    key_points: ["string"],    // Main takeaways
    implications: ["string"],  // Potential impacts
    recommendations: ["string"], // Suggested actions
    questions: ["string"]      // Follow-up questions
  },
  context: {
    // Improved context awareness
    historical: ["string"],    // Historical context
    related_events: ["string"], // Connected events
    dependencies: ["string"]   // Dependencies
  }
}
```

## Next Improvements

### 1. Enhanced Extraction
- Implement Adobe Extract API for OCR
- Add table structure preservation
- Improve form field detection
- Enhance image handling

### 2. Role-Specific Processing
- Add Librarian-specific metadata extraction
- Enhance Detective pattern detection
- Improve Oracle insight generation
- Customize output formats per role

### 3. Data Structure Optimization
- Add hierarchical document relationships
- Implement cross-document references
- Enhance temporal relationships
- Improve entity networks

### 4. Prompt Engineering
- Create role-specific prompt templates
- Add context-aware prompt generation
- Implement dynamic prompt adjustment
- Enhance output formatting prompts

### 5. Quality Improvements
- Add validation rules per role
- Implement confidence scoring
- Add quality metrics
- Enhance error detection

## Implementation Priority

1. Core Improvements
   - Adobe Extract API integration
   - Table/form handling
   - Image processing
   - OCR enhancement

2. Role Optimizations
   - Librarian metadata system
   - Detective analysis tools
   - Oracle insight generation
   - Cross-role integration

3. Structure Enhancements
   - Document relationships
   - Entity networks
   - Temporal analysis
   - Cross-references

4. Prompt Development
   - Role templates
   - Context awareness
   - Dynamic adjustment
   - Output formatting

5. Quality System
   - Validation framework
   - Confidence scoring
   - Quality metrics
   - Error handling
