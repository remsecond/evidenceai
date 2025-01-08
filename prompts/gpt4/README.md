# GPT-4 Complex Analysis

## Input
Place the input file in the `input` directory.

## Prompt Instructions
Perform complex analysis of the input document. Focus on:
1. Pattern detection across multiple dimensions
2. Insight generation
3. Implication analysis
4. Anomaly detection

## Output Format
Return a JSON object with the following structure:
```json
{
    "patterns": [
        {
            "type": "behavioral|temporal|communication|custody",
            "description": "Pattern description",
            "evidence": [
                {
                    "text": "Supporting text",
                    "context": "Full context",
                    "type": "primary|supporting|related"
                }
            ],
            "frequency": {
                "count": 3,
                "period": "week|month|overall",
                "trend": "increasing|stable|decreasing"
            },
            "significance": {
                "score": 0.85,
                "factors": [
                    "Factor 1",
                    "Factor 2"
                ]
            },
            "confidence": 0.92
        }
    ],
    "insights": [
        {
            "type": "observation|inference|recommendation",
            "description": "Insight description",
            "evidence": [
                {
                    "pattern_ref": "Pattern index or ID",
                    "text": "Supporting text",
                    "context": "Full context"
                }
            ],
            "implications": [
                {
                    "description": "Implication description",
                    "severity": "high|medium|low",
                    "confidence": 0.88
                }
            ],
            "confidence": 0.90
        }
    ],
    "anomalies": [
        {
            "type": "behavioral|temporal|communication|custody",
            "description": "Anomaly description",
            "evidence": [
                {
                    "text": "Supporting text",
                    "context": "Full context",
                    "deviation": "Description of how this deviates from normal patterns"
                }
            ],
            "severity": {
                "score": 0.75,
                "factors": [
                    "Factor 1",
                    "Factor 2"
                ]
            },
            "confidence": 0.85
        }
    ],
    "relationships": [
        {
            "type": "pattern_pattern|pattern_insight|insight_anomaly",
            "description": "Relationship description",
            "from": {
                "type": "pattern|insight|anomaly",
                "reference": "Index or ID"
            },
            "to": {
                "type": "pattern|insight|anomaly",
                "reference": "Index or ID"
            },
            "strength": "strong|medium|weak",
            "evidence": [
                {
                    "text": "Supporting text",
                    "context": "Full context"
                }
            ],
            "confidence": 0.88
        }
    ],
    "metadata": {
        "model": "gpt-4",
        "version": "1.0",
        "processing_time": 123,
        "confidence_scores": {
            "pattern_detection": 0.92,
            "insight_generation": 0.90,
            "anomaly_detection": 0.88,
            "relationship_analysis": 0.85
        }
    }
}
```

## Example
Input:
```text
Sarah's pediatrician visit went well. Dr. Smith reviewed her vaccination records and scheduled a follow-up appointment. The Community Center will remain the location for all exchanges between Parent1 and Parent2. This is the third medical appointment this month, all scheduled during Parent1's custody time.
```

Output:
```json
{
    "patterns": [
        {
            "type": "temporal",
            "description": "Medical appointments consistently scheduled during Parent1's custody time",
            "evidence": [
                {
                    "text": "third medical appointment this month",
                    "context": "This is the third medical appointment this month, all scheduled during Parent1's custody time",
                    "type": "primary"
                }
            ],
            "frequency": {
                "count": 3,
                "period": "month",
                "trend": "stable"
            },
            "significance": {
                "score": 0.85,
                "factors": [
                    "Regular medical care coordination",
                    "Consistent scheduling pattern",
                    "Single parent responsibility"
                ]
            },
            "confidence": 0.92
        }
    ],
    "insights": [
        {
            "type": "observation",
            "description": "Parent1 appears to be primary coordinator for medical care",
            "evidence": [
                {
                    "pattern_ref": 0,
                    "text": "all scheduled during Parent1's custody time",
                    "context": "This is the third medical appointment this month, all scheduled during Parent1's custody time"
                }
            ],
            "implications": [
                {
                    "description": "Potential imbalance in medical care responsibilities",
                    "severity": "medium",
                    "confidence": 0.85
                },
                {
                    "description": "Good consistency in medical care management",
                    "severity": "low",
                    "confidence": 0.90
                }
            ],
            "confidence": 0.88
        }
    ],
    "anomalies": [
        {
            "type": "temporal",
            "description": "High frequency of medical appointments in one month",
            "evidence": [
                {
                    "text": "third medical appointment this month",
                    "context": "This is the third medical appointment this month",
                    "deviation": "Multiple medical appointments in short timeframe"
                }
            ],
            "severity": {
                "score": 0.65,
                "factors": [
                    "Higher than typical appointment frequency",
                    "Concentrated in single month"
                ]
            },
            "confidence": 0.85
        }
    ],
    "relationships": [
        {
            "type": "pattern_insight",
            "description": "Medical appointment pattern informs custody responsibility insight",
            "from": {
                "type": "pattern",
                "reference": 0
            },
            "to": {
                "type": "insight",
                "reference": 0
            },
            "strength": "strong",
            "evidence": [
                {
                    "text": "all scheduled during Parent1's custody time",
                    "context": "This is the third medical appointment this month, all scheduled during Parent1's custody time"
                }
            ],
            "confidence": 0.90
        }
    ],
    "metadata": {
        "model": "gpt-4",
        "version": "1.0",
        "processing_time": 234,
        "confidence_scores": {
            "pattern_detection": 0.92,
            "insight_generation": 0.88,
            "anomaly_detection": 0.85,
            "relationship_analysis": 0.90
        }
    }
}
```

## Notes
- Focus on complex patterns across multiple dimensions
- Generate insights that combine multiple observations
- Identify anomalies and deviations from patterns
- Analyze relationships between patterns, insights, and anomalies
- Consider custody-specific implications
- Include confidence scores for all analyses
- Provide detailed evidence for all findings
- Note temporal aspects and trends
- Consider behavioral patterns
- Analyze communication patterns
- Pay attention to custody-related patterns
- Look for potential issues or concerns
- Consider both positive and negative implications
