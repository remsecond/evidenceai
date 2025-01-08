# NotebookLM Timeline Analysis

## Input
Place the input file in the `input` directory.

## Prompt Instructions
Analyze the input document to extract timeline information. Focus on:
1. Events with dates
2. Time periods
3. Temporal relationships
4. Relative time references

## Output Format
Return a JSON object with the following structure:
```json
{
    "events": [
        {
            "date": "YYYY-MM-DD",
            "description": "Event description",
            "context": "Surrounding context",
            "confidence": 0.95
        }
    ],
    "periods": [
        {
            "start": "YYYY-MM-DD",
            "end": "YYYY-MM-DD",
            "description": "Period description",
            "context": "Surrounding context",
            "confidence": 0.90
        }
    ],
    "references": [
        {
            "type": "week|month|year|weekend",
            "relative": "last|next|this",
            "context": "Full reference text",
            "confidence": 0.85
        }
    ],
    "relationships": [
        {
            "from": "Event or period reference",
            "to": "Event or period reference",
            "type": "precedes|follows|overlaps|contains",
            "confidence": 0.88
        }
    ],
    "metadata": {
        "model": "notebookLM",
        "version": "1.0",
        "processing_time": 123,
        "confidence_scores": {
            "event_extraction": 0.92,
            "period_detection": 0.88,
            "relationship_analysis": 0.85
        }
    }
}
```

## Example
Input:
```text
Last week's doctor appointment (Dec 7) went well. Next follow-up scheduled for January 15, 2024.
```

Output:
```json
{
    "events": [
        {
            "date": "2023-12-07",
            "description": "Doctor appointment went well",
            "context": "Last week's doctor appointment (Dec 7) went well",
            "confidence": 0.95
        },
        {
            "date": "2024-01-15",
            "description": "Follow-up appointment",
            "context": "Next follow-up scheduled for January 15, 2024",
            "confidence": 0.95
        }
    ],
    "periods": [],
    "references": [
        {
            "type": "week",
            "relative": "last",
            "context": "Last week's doctor appointment",
            "confidence": 0.90
        }
    ],
    "relationships": [
        {
            "from": "2023-12-07",
            "to": "2024-01-15",
            "type": "precedes",
            "confidence": 0.95
        }
    ],
    "metadata": {
        "model": "notebookLM",
        "version": "1.0",
        "processing_time": 234,
        "confidence_scores": {
            "event_extraction": 0.95,
            "period_detection": 0.90,
            "relationship_analysis": 0.92
        }
    }
}
```

## Notes
- All dates should be in ISO format (YYYY-MM-DD)
- Confidence scores should be between 0 and 1
- Include relevant context for each extraction
- Handle relative time references (last week, next month, etc.)
- Identify relationships between events and periods
