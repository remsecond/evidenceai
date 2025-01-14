# Data Source Combinations Analysis

## Single Source Scenarios

1. OFW Messages Only
   - Primary source: PDF files from OFW
   - Processing focus: Document extraction and timeline creation
   - Special handling: 
     * Timeline will be based solely on OFW message dates
     * Mark other sources as "Not Available" rather than "Not Started"
     * Validate completeness of OFW data set

2. Emails Only
   - Primary source: Email files (.eml/.txt)
   - Processing focus: Email content and metadata extraction
   - Special handling:
     * Timeline based on email timestamps
     * Attachment tracking not required
     * Mark other sources as "Not Available"

3. Email Data Table Only
   - Primary source: CSV/JSON structured data
   - Processing focus: Structured data parsing
   - Special handling:
     * Timeline based on table date fields
     * Validate table schema completeness
     * Mark other sources as "Not Available"

## Dual Source Scenarios

4. OFW Messages + Emails
   - Primary sources: PDF files + Email files
   - Processing focus: Document correlation and timeline merging
   - Special handling:
     * Cross-reference messages with emails
     * Merge timelines with duplicate detection
     * Mark data table as "Not Available"
     * Validate date consistency between sources

5. OFW Messages + Data Table
   - Primary sources: PDF files + CSV/JSON
   - Processing focus: Document-to-record matching
   - Special handling:
     * Match OFW entries with table records
     * Use table data to enrich OFW content
     * Mark emails as "Not Available"
     * Validate data consistency

6. Emails + Data Table
   - Primary sources: Email files + CSV/JSON
   - Processing focus: Email-to-record correlation
   - Special handling:
     * Match emails with table records
     * Enrich email data with table information
     * Mark OFW as "Not Available"
     * Check for data completeness

## Complete Set Scenario

7. All Sources Present
   - All sources: OFW + Emails + Data Table
   - Processing focus: Complete data integration
   - Special handling:
     * Full cross-referencing between all sources
     * Comprehensive timeline creation
     * Validate consistency across all sources
     * Generate completeness report

## Implementation Requirements

### UI Updates Needed
1. Status indicators to show:
   - "Not Available" vs "Not Started" states
   - Source combination being processed
   - Validation status for each combination

2. Processing Pipeline Adjustments
   - Dynamic validation rules based on available sources
   - Source-specific processing steps
   - Combination-specific consolidation logic

3. Output Handling
   - Combination-specific report generation
   - Clear indication of missing data sources
   - Confidence scores based on available data

### API Enhancements Required
1. Validation Endpoints
   ```javascript
   POST /api/validate-sources
   {
     sources: {
       ofw: boolean,
       emails: boolean,
       dataTable: boolean
     }
   }
   ```

2. Processing Configuration
   ```javascript
   POST /api/configure-pipeline
   {
     availableSources: string[],
     processingMode: "single"|"dual"|"complete",
     validationRules: object
   }
   ```

3. Status Reporting
   ```javascript
   GET /api/processing-status
   Response: {
     activeSources: string[],
     processingMode: string,
     progress: object,
     validationResults: object
   }
   ```

## Next Steps

1. Update Pipeline Monitor UI
   - Add source availability indicators
   - Implement combination-specific status displays
   - Add validation status for each combination

2. Enhance Processing Logic
   - Implement source-specific processors
   - Add combination validation rules
   - Create merged timeline logic

3. Update API Layer
   - Add new endpoints for source validation
   - Implement combination-specific processing
   - Enhance status reporting

4. Testing Requirements
   - Create test cases for each combination
   - Validate cross-source data consistency
   - Test timeline merging accuracy
