# EvidenceAI

PDF processing and analysis pipeline with multi-model support.

## Current Status

See [CHECKPOINT.md](CHECKPOINT.md) for latest working features and progress.

## Features

- PDF processing with smart chunking
- Multi-model support (claude, deepseek, gpt4, notebooklm, sonnet)
- Structure-preserving text extraction
- Detailed metadata and reporting

## Installation

```bash
npm install
```

## Usage

Process a PDF file:
```bash
node scripts/process-ofw-with-pdf.js "path/to/your.pdf"
```

Output will be created in:
```
ai-outputs/
  ├── claude/
  ├── deepseek/
  ├── gpt4/
  ├── notebooklm/
  └── sonnet/
```

Each run creates a timestamped directory containing:
- Chunked JSON files with metadata
- Full extracted text
- Processing report
- Success log

## Development

Key components:
- `scripts/process-ofw-with-pdf.js`: Main processing pipeline
- `src/services/pdf-processor.js`: Core PDF processing logic

## Testing

Test files are located in `test-data/`. The pipeline has been tested with files up to 1,048 pages and 515K tokens.
