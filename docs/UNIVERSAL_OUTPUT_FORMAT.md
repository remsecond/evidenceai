# Universal Output Format

## Core Principle: Consistent Structure, Variable Completeness

The key insight is that our output format should be identical regardless of available sources, with explicit handling of missing information. This allows LLMs to work with a familiar structure while naturally adapting to available data.

## Universal Brief Structure

```typescript
interface UniversalBrief {
  metadata: {
    // Always present - describes data availability
    sources: {
      ofw: { present: boolean, count?: number },
      email: { present: boolean, count?: number },
      attachments: { present: boolean, count?: number }
    },
    timeframe: {
      start: string,  // Earliest timestamp found
      end: string,    // Latest timestamp found
      confidence: number // Confidence in completeness
    }
  },

  timeline: {
    // Always present - core chronological structure
    events: Array<{
      timestamp: string,
      type: "message" | "document" | "action",
      content: string,
      sources: string[],  // Which sources mention this
      evidence: {
        direct: string[], // Direct proof (e.g., document)
        indirect: string[] // Supporting evidence
      },
      confidence: number
    }>,
    gaps: Array<{
      start: string,
      end: string,
      type: "missing_data" | "logical_gap" | "time_gap"
    }>
  },

  claims: {
    // All claims found, with evidence status
    statements: Array<{
      text: string,
      source: string,
      timestamp: string,
      evidence: {
        status: "verified" | "partial" | "unverified",
        supporting: Array<{
          type: string,
          source: string,
          strength: number
        }>,
        contradicting: Array<{
          type: string,
          source: string,
          strength: number
        }>
      },
      confidence: number
    }>,
    patterns: Array<{
      type: string,
      frequency: number,
      examples: string[],
      confidence: number
    }>
  },

  documents: {
    // All referenced documents, even if not available
    inventory: Array<{
      id: string,
      type: string,
      status: "present" | "referenced" | "missing",
      source: string,
      timestamp: string,
      relationships: Array<{
        type: "supports" | "contradicts" | "references",
        target: string,
        strength: number
      }>,
      verification: {
        method?: string,
        status: "verified" | "unverified",
        confidence: number
      }
    }>
  },

  analysis: {
    // Always present - adapts to available data
    summary: {
      text: string,
      confidence: number,
      limitations: string[]
    },
    patterns: Array<{
      type: string,
      description: string,
      evidence: string[],
      confidence: number
    }>,
    gaps: Array<{
      type: string,
      description: string,
      impact: string,
      mitigation?: string
    }>,
    confidence: {
      overall: number,
      bySource: Record<string, number>,
      limitations: string[]
    }
  }
}
```

## Example: Complete Dataset

```typescript
const completeBrief: UniversalBrief = {
  metadata: {
    sources: {
      ofw: { present: true, count: 15 },
      email: { present: true, count: 23 },
      attachments: { present: true, count: 12 }
    },
    timeframe: {
      start: "2024-10-31T00:00:00Z",
      end: "2025-01-12T00:00:00Z",
      confidence: 0.95
    }
  },
  // ... full data in all sections
};
```

## Example: Partial Dataset (OFW Only)

```typescript
const partialBrief: UniversalBrief = {
  metadata: {
    sources: {
      ofw: { present: true, count: 15 },
      email: { present: false },
      attachments: { present: false }
    },
    timeframe: {
      start: "2024-10-31T00:00:00Z",
      end: "2025-01-12T00:00:00Z",
      confidence: 0.75 // Lower due to missing sources
    }
  },
  // ... same structure, but with gaps noted
};
```

## LLM Integration

1. **Consistent Prompt Structure**
   ```typescript
   const promptTemplate = `
   Analyze the following communication record:
   
   Available Sources: ${brief.metadata.sources}
   Time Period: ${brief.metadata.timeframe}
   
   Consider:
   1. Overall confidence: ${brief.analysis.confidence.overall}
   2. Known limitations: ${brief.analysis.confidence.limitations}
   3. Available evidence types
   
   Brief: ${JSON.stringify(brief, null, 2)}
   
   Provide an analysis that:
   1. Acknowledges data limitations
   2. Focuses on verifiable facts
   3. Clearly indicates confidence levels
   4. Notes any significant gaps
   `;
   ```

2. **Adaptive Analysis**
   ```typescript
   interface AnalysisStrategy {
     // Adapts to available data
     determineScope(brief: UniversalBrief): {
       possibleAnalyses: string[],
       confidenceThresholds: Record<string, number>,
       requiredSources: Record<string, string[]>
     };
     
     // Generates appropriate prompts
     generatePrompt(brief: UniversalBrief, scope: string): string;
     
     // Validates outputs
     validateAnalysis(analysis: string, brief: UniversalBrief): {
       valid: boolean,
       issues: string[],
       suggestions: string[]
     };
   }
   ```

## Benefits

1. **Consistency**
   - Same structure regardless of data completeness
   - Explicit handling of missing information
   - Clear confidence indicators
   - Standardized evidence linking

2. **Adaptability**
   - Graceful handling of missing sources
   - Explicit gap identification
   - Confidence scoring adapts to available data
   - Natural scaling of analysis depth

3. **Transparency**
   - Clear source attribution
   - Explicit confidence levels
   - Known limitations stated
   - Evidence chains preserved

4. **LLM Optimization**
   - Consistent input format
   - Natural handling of uncertainty
   - Clear evidence relationships
   - Structured confidence scoring

## Implementation Strategy

1. **Phase 1: Core Structure**
   - Implement universal brief format
   - Build basic evidence linking
   - Create confidence scoring
   - Set up gap tracking

2. **Phase 2: Analysis Engine**
   - Implement pattern detection
   - Build timeline analysis
   - Create evidence validator
   - Add relationship mapping

3. **Phase 3: LLM Integration**
   - Create adaptive prompting
   - Build output validation
   - Implement confidence thresholds
   - Add analysis strategies

## Success Metrics

1. **Format Consistency**
   - Structure maintained across all scenarios
   - Graceful handling of missing data
   - Clear confidence indicators
   - Explicit gap identification

2. **Analysis Quality**
   - Appropriate depth for available data
   - Clear limitation acknowledgment
   - Evidence-based conclusions
   - Confidence-aware insights

3. **LLM Performance**
   - Consistent output quality
   - Appropriate uncertainty handling
   - Evidence-based reasoning
   - Adaptive analysis depth
