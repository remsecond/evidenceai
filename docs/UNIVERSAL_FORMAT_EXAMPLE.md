# Universal Format Example: Travel Documentation Case

Using real test data from `3_File_Nov_Jan_Test`, here's how the universal format maintains consistency across different data availability scenarios.

## Scenario 1: Complete Dataset

```typescript
const completeBrief: UniversalBrief = {
  metadata: {
    sources: {
      ofw: { present: true, count: 12 },
      email: { present: true, count: 8 },
      attachments: { present: true, count: 15 }
    },
    timeframe: {
      start: "2024-10-31T00:00:00Z",
      end: "2025-01-12T00:00:00Z",
      confidence: 0.95
    }
  },

  timeline: {
    events: [
      {
        timestamp: "2024-11-15T09:00:00Z",
        type: "message",
        content: "Initial request for travel documentation",
        sources: ["email"],
        evidence: {
          direct: ["Email exchange with christinemoyer_hotmail.com"],
          indirect: []
        },
        confidence: 0.9
      },
      {
        timestamp: "2024-11-20T08:30:00Z",
        type: "document",
        content: "Travel authorization form submitted",
        sources: ["email", "attachments"],
        evidence: {
          direct: ["Adrian Yukon Auth 11_20_24.pdf"],
          indirect: ["Email confirmation"]
        },
        confidence: 0.95
      },
      {
        timestamp: "2024-12-20T11:30:00Z",
        type: "document",
        content: "Health form submitted",
        sources: ["email", "attachments"],
        evidence: {
          direct: ["Travel Health Form.pdf"],
          indirect: ["Email thread"]
        },
        confidence: 0.95
      }
    ],
    gaps: []
  },

  claims: {
    statements: [
      {
        text: "Travel authorization form was submitted",
        source: "email",
        timestamp: "2024-11-20T08:30:00Z",
        evidence: {
          status: "verified",
          supporting: [
            {
              type: "document",
              source: "Adrian Yukon Auth 11_20_24.pdf",
              strength: 0.95
            },
            {
              type: "email",
              source: "confirmation thread",
              strength: 0.85
            }
          ],
          contradicting: []
        },
        confidence: 0.95
      }
    ],
    patterns: [
      {
        type: "document_submission",
        frequency: 3,
        examples: [
          "Authorization form",
          "Health form",
          "Consent form"
        ],
        confidence: 0.9
      }
    ]
  },

  documents: {
    inventory: [
      {
        id: "auth-form-2024-11-20",
        type: "authorization",
        status: "present",
        source: "attachments",
        timestamp: "2024-11-20T08:30:00Z",
        relationships: [
          {
            type: "supports",
            target: "claim-auth-submitted",
            strength: 0.95
          }
        ],
        verification: {
          method: "digital_signature",
          status: "verified",
          confidence: 0.95
        }
      }
    ]
  },

  analysis: {
    summary: {
      text: "Complete travel documentation process verified through multiple sources",
      confidence: 0.95,
      limitations: []
    },
    patterns: [
      {
        type: "process_compliance",
        description: "All required documents submitted in correct order",
        evidence: [
          "Authorization form",
          "Health form",
          "Consent forms"
        ],
        confidence: 0.95
      }
    ],
    gaps: [],
    confidence: {
      overall: 0.95,
      bySource: {
        email: 0.9,
        attachments: 0.95,
        ofw: 0.85
      },
      limitations: []
    }
  }
};
```

## Scenario 2: Email Only (No Attachments)

```typescript
const emailOnlyBrief: UniversalBrief = {
  metadata: {
    sources: {
      ofw: { present: false },
      email: { present: true, count: 8 },
      attachments: { present: false }
    },
    timeframe: {
      start: "2024-10-31T00:00:00Z",
      end: "2025-01-12T00:00:00Z",
      confidence: 0.7 // Lower due to missing sources
    }
  },

  timeline: {
    events: [
      {
        timestamp: "2024-11-15T09:00:00Z",
        type: "message",
        content: "Initial request for travel documentation",
        sources: ["email"],
        evidence: {
          direct: ["Email exchange with christinemoyer_hotmail.com"],
          indirect: []
        },
        confidence: 0.8
      }
    ],
    gaps: [
      {
        start: "2024-11-15T09:00:00Z",
        end: "2024-12-26T10:30:00Z",
        type: "missing_data"
      }
    ]
  },

  claims: {
    statements: [
      {
        text: "Travel authorization form was submitted",
        source: "email",
        timestamp: "2024-11-20T08:30:00Z",
        evidence: {
          status: "partial",
          supporting: [
            {
              type: "email",
              source: "confirmation thread",
              strength: 0.7
            }
          ],
          contradicting: []
        },
        confidence: 0.7
      }
    ],
    patterns: []
  },

  documents: {
    inventory: [
      {
        id: "auth-form-2024-11-20",
        type: "authorization",
        status: "referenced",
        source: "email",
        timestamp: "2024-11-20T08:30:00Z",
        relationships: [],
        verification: {
          status: "unverified",
          confidence: 0.5
        }
      }
    ]
  },

  analysis: {
    summary: {
      text: "Travel documentation process partially verified through email correspondence",
      confidence: 0.7,
      limitations: [
        "No access to actual documents",
        "Verification limited to email references"
      ]
    },
    patterns: [],
    gaps: [
      {
        type: "missing_evidence",
        description: "Referenced documents not available for verification",
        impact: "Cannot fully verify document submission claims",
        mitigation: "Consider requesting access to referenced attachments"
      }
    ],
    confidence: {
      overall: 0.7,
      bySource: {
        email: 0.7
      },
      limitations: [
        "Analysis based solely on email correspondence",
        "Unable to verify document authenticity"
      ]
    }
  }
};
```

## Key Points

1. **Structural Consistency**
   - Same format and sections in both scenarios
   - Clear indication of missing data
   - Consistent confidence scoring
   - Explicit gap identification

2. **Adaptive Detail**
   - Full scenario includes rich evidence chains
   - Partial scenario acknowledges limitations
   - Confidence scores reflect available data
   - Gaps clearly documented

3. **LLM-Friendly Format**
   - Consistent structure for prompting
   - Clear indication of limitations
   - Evidence-based confidence scoring
   - Natural handling of missing data

4. **Analysis Adaptation**
   - Full analysis when data complete
   - Limited but useful analysis with partial data
   - Clear documentation of limitations
   - Appropriate confidence levels

## Benefits

1. **For Complete Data**
   - Rich evidence chains
   - High confidence scores
   - Detailed pattern analysis
   - Comprehensive verification

2. **For Partial Data**
   - Clear limitation acknowledgment
   - Appropriate confidence reduction
   - Useful partial analysis
   - Gap identification

3. **For LLMs**
   - Consistent input structure
   - Clear confidence guidance
   - Explicit limitation awareness
   - Evidence-based reasoning support
