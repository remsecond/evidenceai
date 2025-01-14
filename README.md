# EvidenceAI

A modular document processing system for extracting, analyzing, and correlating evidence from multiple document types.

## Core Features

- PDF document processing with smart chunking
- Email thread analysis and extraction
- OFW (Office File Wrapper) document support
- Google Sheets integration for document tracking
- Timeline generation and correlation
- LLM-powered content analysis

## Project Structure

```
evidenceai/
├── src/                    # Source code
│   ├── processors/         # Document processors
│   ├── services/          # Core services
│   ├── schemas/           # Data schemas
│   └── utils/             # Utility functions
├── test/                  # Test files
│   ├── fixtures/          # Test data
│   ├── mocks/            # Test mocks
│   └── unit/             # Unit tests
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── Web/                  # Web interface
└── config/               # Configuration files
```

## Prerequisites

- Node.js 18+
- Python 3.8+
- Google Cloud project with Sheets API enabled

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/evidenceai.git
cd evidenceai
```

2. Install dependencies:
```bash
npm install
python -m pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Configure Google integration:
```bash
node scripts/setup-google-project.js
```

## Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

## Core Pipeline

The core document processing pipeline:

1. Document Ingestion
   - Supports PDF, email, and OFW formats
   - Smart chunking for optimal processing

2. Content Extraction
   - Text extraction with metadata
   - Structure preservation
   - Format-specific handling

3. Analysis
   - LLM-powered content analysis
   - Timeline correlation
   - Evidence chain building

4. Output Generation
   - Google Sheets integration
   - Timeline visualization
   - Evidence summaries

## Testing

Run specific test suites:

```bash
# Core pipeline tests
npm run test:core-pipeline

# Format handling tests
npm run test:format-handling

# Smart chunking tests
npm run test:smart-chunking
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- PDF processing powered by pdf-parse
- Email parsing by email-reply-parser
- LLM integration using DeepSeek
