# ChatGPT Evidence Analysis Instructions

## Step 1: Open ChatGPT
1. Go to https://chat.openai.com
2. Start a new conversation
3. Ensure you're using GPT-4 (recommended)

## Step 2: Set Context
Copy and paste this prompt:
```
You are an expert evidence analyst. I will provide several evidence files containing communications, timelines, and relationships. Please analyze them carefully and provide a structured analysis. Wait for me to upload each file before proceeding with the analysis.
```

## Step 3: Upload Files
Upload each file in this exact order:

1. {1}-Email exchange with christinemoyer_hotmail.com after 2024-10-31 before 2025-01-12.pdf
   - Contains email communications and metadata
   - Wait for "Content processed successfully"
   - Verify ChatGPT recognizes email format and content

2. {2}-label Emails from christinemoyer@hotmail.com after 2024-10-31 before 2025-01-12.ods
   - Contains structured email metadata and labels
   - Wait for "Content processed successfully"
   - Verify ChatGPT understands the metadata structure

3. {3}-OFW_Messages_Report_2025-01-12_09-01-06.pdf
   - Contains OFW messages and timeline
   - Wait for "Content processed successfully"
   - Verify ChatGPT acknowledges the message data

## Step 4: Request Analysis
Copy and paste this analysis prompt:
```
Please provide a comprehensive analysis of all uploaded evidence files:

1. Create a timeline of events showing:
   - Chronological sequence
   - Key participants
   - Important actions
   - Communication patterns

2. Identify and analyze:
   - Key participants and their roles
   - Important relationships
   - Notable patterns
   - Significant events

3. Highlight any:
   - Inconsistencies
   - Missing information
   - Areas needing investigation
   - Unusual patterns

Format your response as a detailed report with clear sections and specific references to source materials.
```

## Step 5: Save Analysis
1. Create these files in processed/analysis/:

   a. evidence-report.md
   ```markdown
   ---
   date: [current date]
   source_files: 3
   analysis_type: comprehensive
   model: gpt-4
   ---

   [Paste ChatGPT's complete analysis here]
   ```

   b. findings.json
   ```json
   {
     "timeline": [
       {
         "date": "",
         "event": "",
         "participants": [],
         "source": ""
       }
     ],
     "participants": [
       {
         "name": "",
         "role": "",
         "connections": []
       }
     ],
     "patterns": [
       {
         "type": "",
         "description": "",
         "evidence": []
       }
     ],
     "gaps": [
       {
         "area": "",
         "description": "",
         "impact": ""
       }
     ]
   }
   ```

   c. review-notes.md
   ```markdown
   # Analysis Review Notes

   ## Completeness Check
   - [ ] All events covered
   - [ ] All participants identified
   - [ ] All relationships mapped
   - [ ] All patterns noted

   ## Quality Check
   - [ ] Timeline accuracy
   - [ ] Participant roles clear
   - [ ] Evidence properly cited
   - [ ] Gaps identified

   ## Follow-up Items
   1. [Item needing investigation]
   2. [Missing information to gather]
   3. [Patterns to verify]
   ```

## Step 6: Quality Review
1. Check timeline accuracy
   - All dates correct
   - Events in sequence
   - No missing events

2. Verify participant analysis
   - All parties included
   - Roles correctly identified
   - Relationships accurate

3. Validate evidence citations
   - Sources referenced
   - Claims supported
   - Links verified

4. Review gaps and findings
   - Missing data noted
   - Uncertainties marked
   - Follow-up items listed

## Step 7: Save Location
Ensure all files are saved in:
```
processed/
└── analysis/
    ├── evidence-report.md    # ChatGPT's analysis
    ├── findings.json         # Structured data
    └── review-notes.md       # Quality review
```

## Common Issues

1. If ChatGPT doesn't recognize a file:
   - Check file uploaded completely
   - Try uploading again
   - Verify file format is correct

2. If analysis seems incomplete:
   - Ask for specific missing aspects
   - Request focus on gaps
   - Ask for more detail in weak areas

3. If timeline is unclear:
   - Request chronological reordering
   - Ask for specific date/time clarification
   - Request timeline visualization

4. If relationships are vague:
   - Ask for relationship mapping
   - Request specific connection details
   - Ask for interaction patterns

Generated: {date}
