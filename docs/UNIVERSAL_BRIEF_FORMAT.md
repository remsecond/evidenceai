# Universal Brief Format

## Core Concept

Rather than creating specialized formats for different data source combinations, we use a single, consistent brief structure that naturally accommodates both present and absent information. This approach allows LLMs to work with a familiar format while gracefully handling varying levels of data completeness.

## Brief Structure

```typescript
interface UniversalBrief {
  metadata: {
    timestamp: string,
    sources: {
      ofw: { available: boolean, count?: number },
      email: { available: boolean, count?: number },
      table: { available: boolean, count?: number }
    },
    confidence: {
      overall: number,  // Weighted score based on available sources
      temporal: number, // Confidence in timeline accuracy
      contextual: number // Confidence in context completeness
    }
  },
  content: {
    // Core message content - always present, may be partial
    messages: [
      {
        id: string,
        timestamp: string,
        content: string,
        source: "ofw" | "email" | "table",
        confidence: number,
        // Optional fields marked with presence indicators
        attachments?: {
          present: boolean,
          count?: number,
          details?: Array<{
            name: string,
            type: string,
            size?: number
          }>
        },
        metadata?: {
          present: boolean,
          fields?: Record<string, any>
        }
      }
    ],
    
    // Context sections - always present but may be empty
    relationships: {
      present: boolean,
      data?: Array<{
        type: string,
        entities: string[],
        confidence: number
      }>
    },
    
    timeline: {
      present: boolean,
      events?: Array<{
        timestamp: string,
        description: string,
        sources: string[],
        confidence: number
      }>
    },
    
    analysis: {
      present: boolean,
      summary?: string,
      keyPoints?: string[],
      confidence: number
    }
  }
}
```

## Key Principles

1. **Consistent Structure**
   - The brief format remains identical regardless of available sources
   - All sections are always present, even if empty
   - Missing data is explicitly marked rather than omitted

2. **Natural Language Indicators**
   - Instead of null values, use descriptive placeholders
   - Example: "No email data available" vs null
   - Helps LLMs understand context naturally

3. **Confidence Scoring**
   - Each data point includes a confidence score
   - Aggregate scores reflect overall data completeness
   - Helps LLMs weight information appropriately

4. **Source Attribution**
   - All data points maintain source information
   - Helps LLMs understand data provenance
   - Enables source-aware reasoning

## Example Scenarios

### Complete Dataset
```json
{
  "metadata": {
    "timestamp": "2024-01-10T12:00:00Z",
    "sources": {
      "ofw": { "available": true, "count": 15 },
      "email": { "available": true, "count": 23 },
      "table": { "available": true, "count": 38 }
    },
    "confidence": {
      "overall": 0.95,
      "temporal": 0.98,
      "contextual": 0.92
    }
  },
  "content": {
    "messages": [
      {
        "id": "msg-001",
        "timestamp": "2024-01-01T10:30:00Z",
        "content": "Meeting scheduled for project review",
        "source": "email",
        "confidence": 0.98,
        "attachments": {
          "present": true,
          "count": 2,
          "details": [
            {
              "name": "agenda.pdf",
              "type": "application/pdf",
              "size": 245760
            }
          ]
        }
      }
    ],
    "relationships": {
      "present": true,
      "data": [
        {
          "type": "collaboration",
          "entities": ["TeamA", "TeamB"],
          "confidence": 0.89
        }
      ]
    }
  }
}
```

### OFW-Only Dataset
```json
{
  "metadata": {
    "timestamp": "2024-01-10T12:00:00Z",
    "sources": {
      "ofw": { "available": true, "count": 15 },
      "email": { "available": false },
      "table": { "available": false }
    },
    "confidence": {
      "overall": 0.45,
      "temporal": 0.65,
      "contextual": 0.35
    }
  },
  "content": {
    "messages": [
      {
        "id": "msg-001",
        "timestamp": "2024-01-01T10:30:00Z",
        "content": "Meeting scheduled for project review",
        "source": "ofw",
        "confidence": 0.85,
        "attachments": {
          "present": false
        },
        "metadata": {
          "present": false
        }
      }
    ],
    "relationships": {
      "present": true,
      "data": [
        {
          "type": "temporal",
          "entities": ["Event1", "Event2"],
          "confidence": 0.65
        }
      ]
    }
  }
}
```

## LLM Integration

1. **Prompt Design**
   ```text
   You are analyzing a communication dataset. The brief includes all available information, with confidence scores indicating reliability. Some data sources may be unavailable or incomplete.
   
   Consider:
   1. Overall confidence scores when weighing information
   2. Source availability when making inferences
   3. Explicit gaps in data when drawing conclusions
   
   Brief: [Universal Brief JSON]
   
   Based on the available information, provide your analysis...
   ```

2. **Confidence-Aware Processing**
   - LLMs can use confidence scores to weight information
   - Missing data is explicitly marked, allowing for uncertainty-aware reasoning
   - Source attribution enables context-aware analysis

3. **Consistent Output**
   - LLMs receive the same structure regardless of data completeness
   - Analysis can adapt to available information naturally
   - Conclusions include appropriate caveats based on data availability

## Benefits

1. **Simplicity**
   - One format for all scenarios
   - Predictable structure for LLMs
   - Clear handling of missing data

2. **Flexibility**
   - Gracefully handles any combination of sources
   - Easily extensible for new data types
   - Natural scaling of confidence with data availability

3. **Transparency**
   - Clear indication of data gaps
   - Explicit confidence scoring
   - Source attribution throughout

4. **LLM Optimization**
   - Format designed for natural language processing
   - Consistent structure improves LLM reliability
   - Explicit uncertainty handling improves output quality
