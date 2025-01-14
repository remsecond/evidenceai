# EvidenceAI Timeline Control

A visualization interface for exploring document timelines, relationships, and evolution.

## Features

- Interactive timeline visualization
- Document filtering by type and date range
- Storage statistics and relationship tracking
- Real-time data updates
- Attachment deduplication tracking

## Getting Started

1. Start the Timeline Control interface:
   ```bash
   .\start-timeline-control.bat
   ```
   This will:
   - Install required dependencies (express, cors)
   - Start the timeline server on port 3002
   - Open the interface in your default browser

2. Stop the Timeline Control interface:
   ```bash
   .\stop-timeline-control.bat
   ```
   This will cleanly shut down the server.

## Available Views

1. Timeline View
   - Chronological display of documents
   - Visual indicators for relationships
   - Document type markers

2. Relationship Graph
   - Document connections and dependencies
   - Version tracking
   - Attachment linkages

3. Storage Stats
   - Document counts by type
   - Storage efficiency metrics
   - Deduplication statistics

## API Endpoints

The timeline server provides the following endpoints:

1. `GET /api/timeline-data`
   - Returns timeline events and storage statistics
   - Supports filtering by:
     - startDate: Filter events after this date
     - endDate: Filter events before this date
     - type: Filter by document type (email, document, spreadsheet)

## Development

The Timeline Control interface is built with:
- Express.js for the backend server
- Plotly.js for timeline visualization
- TailwindCSS for styling
- Vanilla JavaScript for interactivity

Source files:
- `Web/mission-control-timeline.html`: Main interface
- `scripts/timeline-server.js`: Backend server
- `simple-pdf-processor/src/services/timeline-processor.js`: Timeline data processing
