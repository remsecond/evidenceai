# ChatGPT Evidence Analysis Process

## Step 1: Prepare Evidence Files

Gather these processed files in order:

1. simple-pdf-processor/test/fixtures/sample-ofw.txt
   - Contains OFW message data
   - Timeline information
   - Communication patterns

2. simple-pdf-processor/test/fixtures/sample-email.txt
   - Email communications
   - Participant information
   - Timestamps

3. simple-pdf-processor/test/fixtures/sample-records.json
   - Structured metadata
   - Relationship data
   - Attribution details

4. simple-pdf-processor/test/fixtures/sample-records.csv
   - Timeline events
   - Cross-references
   - Entity relationships

## Step 2: ChatGPT Instructions

1. Open ChatGPT (GPT-4 recommended)
2. Start a new conversation
3. Copy and paste this prompt:

```
You are an expert evidence analyst. I will provide several evidence files containing communications, timelines, and relationships. Please:

1. Analyze the evidence to identify:
   - Key participants and their roles
   - Timeline of events
   - Communication patterns
   - Important relationships
   - Notable themes or topics

2. Create a structured analysis with:
   - Chronological event sequence
   - Participant interaction map
   - Key findings and observations
   - Supporting evidence references
   - Confidence levels for each finding

3. Highlight any:
   - Inconsistencies
   - Gaps in information
   - Patterns of behavior
   - Notable correlations
   - Areas needing further investigation

Format your response as a detailed evidence analysis report with clear sections and specific references to the source materials.
```

## Step 3: File Upload Sequence

1. Upload sample-ofw.txt
   - Wait for processing
   - Confirm content recognition

2. Upload sample-email.txt
   - Wait for processing
   - Verify email parsing

3. Upload sample-records.json
   - Wait for processing
   - Check metadata integration

4. Upload sample-records.csv
   - Wait for processing
   - Confirm timeline alignment

## Step 4: Save Analysis

Create these files:

1. processed/analysis/evidence-report.md
```markdown
---
date: [current date]
source_files: 4
analysis_type: comprehensive
model: gpt-4
---

[Paste ChatGPT's complete analysis here]
```

2. processed/analysis/findings.json
```json
{
  "participants": [],
  "timeline": [],
  "relationships": [],
  "themes": [],
  "gaps": [],
  "confidence_scores": {}
}
```

## Step 5: Review Output

Check these aspects:

1. Timeline Accuracy
   - Event sequence correct
   - Timestamps aligned
   - No missing events

2. Participant Analysis
   - All parties identified
   - Roles correctly assigned
   - Relationships mapped

3. Evidence Support
   - Claims referenced
   - Sources cited
   - Confidence scored

4. Information Gaps
   - Missing data noted
   - Uncertainties marked
   - Further investigation needs

## Expected Output Format

```markdown
# Evidence Analysis Report

## 1. Executive Summary
- Key findings
- Critical events
- Major participants

## 2. Timeline Analysis
- Chronological sequence
- Key dates
- Event clusters

## 3. Participant Analysis
- Individual profiles
- Relationship maps
- Communication patterns

## 4. Key Findings
- Primary conclusions
- Supporting evidence
- Confidence levels

## 5. Information Gaps
- Missing data
- Uncertainties
- Investigation needs
```

## Quality Metrics

Verify these aspects:
- [ ] All events accounted for
- [ ] Participants correctly identified
- [ ] Relationships properly mapped
- [ ] Evidence properly cited
- [ ] Gaps clearly identified

## Save Locations

```
processed/
└── analysis/
    ├── evidence-report.md
    ├── findings.json
    └── review-notes.md
```

## Next Steps

1. Review analysis accuracy
2. Identify missing information
3. Plan follow-up investigation
4. Update evidence package
5. Document new findings
