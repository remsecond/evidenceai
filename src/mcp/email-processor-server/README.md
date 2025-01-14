# Email Processor Server

A TypeScript-based email processing server that can parse emails from various formats (PDF, text, EML) and extract structured content including headers, body, metadata, and attachments.

## Features

- Parse emails from multiple formats:
  - PDF files (extracts text and converts to email format)
  - Plain text files
  - EML (email) files
- Extract and format email headers
- Parse email body content
- Handle email metadata (sender, recipients, date, subject)
- Process email attachments
- Support for email reply chains
- Proper MIME type handling

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

## Usage

```typescript
import EmailProcessor from './dist/index.js';

// Create a new processor instance
const processor = new EmailProcessor();

// Process an email file
const result = await processor.processEmailFile(
  'path/to/email.pdf',  // or .txt or .eml
  'pdf',                // or 'text' or 'eml'
  {
    includeMetadata: true,
    extractAttachments: true,
    parseHeaders: true
  }
);

// The result will contain:
// - headers: Record<string, string>
// - body: string
// - metadata: { sender, recipients, date, subject }
// - attachments: Array<{ filename, content, contentType }>
```

## Options

The processor accepts the following options:

- `extractAttachments`: Extract and include any email attachments
- `parseHeaders`: Parse and format email headers
- `includeMetadata`: Include structured metadata about the email

## Example Output

```json
{
  "headers": {
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Test Email",
    "date": "Thu Jan 11 2024 10:00:00 GMT-0800",
    "content-type": "text/plain; charset=UTF-8"
  },
  "body": "Email content here...",
  "metadata": {
    "sender": "sender@example.com",
    "recipients": ["recipient@example.com"],
    "date": "2024-01-11T18:00:00.000Z",
    "subject": "Test Email"
  },
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "content": <Buffer ...>
    }
  ]
}
```

## Testing

```bash
npm test
```

## Error Handling

The processor includes comprehensive error handling for:
- File reading errors
- PDF extraction errors
- Email parsing errors
- Invalid format errors

All errors are properly typed and include descriptive messages.
