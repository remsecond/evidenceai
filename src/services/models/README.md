# Model-Specific Processors

Each AI model may have different preferences for:
- Chunk sizes
- Text formatting
- Section markers
- Context handling
- Metadata requirements

## Current Processors

### Deepseek (Implemented)
- Max context: 25K tokens
- Preferred chunk size: 12K tokens
- Section formatting: `### Section Name ###`
- Email formatting: `=== Subject: Email Title`
- Enhanced metadata with processing notes

### Claude (Planned)
- Max context: 100K tokens
- Preferred chunk size: 75K tokens
- XML-style formatting
- Detailed metadata requirements

### GPT-4 (Planned)
- Max context: 32K tokens
- Preferred chunk size: 25K tokens
- Markdown formatting
- System message integration

### NotebookLM (Planned)
- Max context: 200K tokens
- Preferred chunk size: 150K tokens
- Jupyter-style formatting
- Citation tracking

### Sonnet (Planned)
- Max context: 16K tokens
- Preferred chunk size: 12K tokens
- Clean text focus
- Minimal formatting

## Implementation Guide

1. Create model-specific processor extending base functionality:
```javascript
class ModelProcessor {
    constructor() {
        this.baseProcessor = pdfProcessor;
        this.modelName = 'model_name';
        this.maxContextLength = 0;
        this.preferredChunkSize = 0;
        this.overlapSize = 0;
    }
}
```

2. Implement model-specific formatting:
```javascript
formatForModel(text) {
    // Add model-specific formatting
    return formattedText;
}
```

3. Add model-specific metadata:
```javascript
getProcessingNotes(chunk) {
    // Add model-specific notes
    return notes;
}
```

4. Export singleton instance:
```javascript
export default new ModelProcessor();
```

## Usage

```javascript
import modelProcessor from './models/model-processor.js';
const result = await modelProcessor.processPdf(filePath);
