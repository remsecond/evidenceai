# LLM Seed File Analysis Guide

## Overview

The pipeline generates structured seed files for LLM analysis as its final step. These files contain processed and validated evidence data ready for analysis.

## Generated Files

### 1. Timeline Data (1-timeline.json)
```json
{
  "events": [
    {
      "timestamp": "ISO-8601 date",
      "type": "message|email|record",
      "source": "file reference",
      "content": "processed content",
      "participants": ["list of participants"],
      "metadata": {
        "confidence": 0.0-1.0,
        "validation": "validation status"
      }
    }
  ],
  "timeframe": {
    "start": "ISO-8601 date",
    "end": "ISO-8601 date"
  }
}
```

### 2. Relationship Data (2-relationships.json)
```json
{
  "participants": [
    {
      "id": "unique identifier",
      "name": "participant name",
      "role": "identified role",
      "interactions": [
        {
          "with": "other participant id",
          "type": "interaction type",
          "count": "interaction count",
          "timeframe": {
            "start": "ISO-8601 date",
            "end": "ISO-8601 date"
          }
        }
      ]
    }
  ],
  "groups": [
    {
      "members": ["participant ids"],
      "type": "group type",
      "confidence": 0.0-1.0
    }
  ]
}
```

### 3. Validation Data (3-validation.json)
```json
{
  "temporal": {
    "score": 0.0-1.0,
    "issues": [
      {
        "type": "issue type",
        "description": "issue description",
        "severity": "high|medium|low",
        "affected_items": ["affected item references"]
      }
    ]
  },
  "content": {
    "score": 0.0-1.0,
    "validations": [
      {
        "type": "validation type",
        "result": "pass|fail",
        "details": "validation details"
      }
    ]
  },
  "references": {
    "score": 0.0-1.0,
    "verified": ["list of verified references"],
    "unverified": ["list of unverified references"]
  }
}
```

## Analysis Process

1. Timeline Analysis
   - Review chronological sequence
   - Identify key events
   - Note temporal patterns
   - Flag anomalies

2. Relationship Analysis
   - Map participant interactions
   - Identify groups/clusters
   - Analyze communication patterns
   - Note relationship strengths

3. Validation Review
   - Check confidence scores
   - Review validation issues
   - Assess data quality
   - Note areas needing investigation

## ChatGPT Prompting Strategy

### 1. Timeline Understanding
```
Analyze the timeline data focusing on:
1. Key event sequences
2. Temporal patterns
3. Critical moments
4. Participant activities

Format the analysis with:
- Chronological summary
- Pattern identification
- Anomaly detection
- Confidence assessment
```

### 2. Relationship Mapping
```
Analyze the relationship data focusing on:
1. Participant roles and interactions
2. Group dynamics
3. Communication patterns
4. Relationship evolution

Format the analysis with:
- Participant profiles
- Group summaries
- Interaction patterns
- Relationship strengths
```

### 3. Validation Assessment
```
Analyze the validation data focusing on:
1. Data quality issues
2. Confidence scores
3. Verification status
4. Investigation needs

Format the analysis with:
- Quality summary
- Issue identification
- Risk assessment
- Investigation recommendations
```

## Output Templates

### 1. Evidence Report (evidence-report.md)
```markdown
# Evidence Analysis Report

## Timeline Summary
- Key events
- Critical sequences
- Temporal patterns
- Anomalies

## Relationship Analysis
- Key participants
- Group dynamics
- Communication patterns
- Notable relationships

## Validation Assessment
- Data quality
- Confidence levels
- Issues identified
- Investigation needs

## Recommendations
- Further investigation
- Additional validation
- Risk mitigation
```

### 2. Structured Findings (findings.json)
```json
{
  "timeline": {
    "key_events": [],
    "patterns": [],
    "anomalies": []
  },
  "relationships": {
    "key_participants": [],
    "groups": [],
    "patterns": []
  },
  "validation": {
    "issues": [],
    "risks": [],
    "recommendations": []
  }
}
```

### 3. Review Notes (review-notes.md)
```markdown
# Analysis Review Notes

## Completeness Check
- [ ] Timeline fully analyzed
- [ ] Relationships mapped
- [ ] Validation reviewed

## Quality Check
- [ ] Confidence scores assessed
- [ ] Issues documented
- [ ] Recommendations provided

## Follow-up Items
1. [Investigation needs]
2. [Validation requirements]
3. [Risk mitigations]
```

## Best Practices

1. Data Review
   - Read all files thoroughly
   - Note initial observations
   - Identify patterns
   - Mark questions/concerns

2. Analysis Approach
   - Start with timeline
   - Map relationships
   - Review validation
   - Synthesize findings

3. Quality Control
   - Check confidence scores
   - Verify references
   - Document uncertainties
   - Note limitations

4. Documentation
   - Use provided templates
   - Be specific
   - Include evidence
   - Note confidence levels

## Common Pitfalls

1. Analysis Issues
   - Overlooking low confidence data
   - Missing temporal patterns
   - Incomplete relationship mapping
   - Ignoring validation issues

2. Documentation Problems
   - Vague conclusions
   - Missing evidence
   - Unclear recommendations
   - Incomplete templates

3. Quality Concerns
   - Skipping validation review
   - Ignoring confidence scores
   - Missing critical patterns
   - Incomplete analysis
