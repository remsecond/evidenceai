# Manual LLM Testing Process

## Directory Structure
C:/Users/robmo/Desktop/evidenceai/prompts/
├── notebooklm/
│   ├── README.md - Timeline analysis instructions
│   ├── input/
│   │   └── sample_email.txt - Test email
│   └── output/
│       └── (Place timeline_analysis.json here)
│
├── sonnet/
│   ├── README.md - Semantic analysis instructions
│   ├── input/
│   │   └── sample_email.txt - Test email
│   └── output/
│       └── (Place semantic_analysis.json here)
│
├── deepseek/
│   ├── README.md - Entity extraction instructions
│   ├── input/
│   │   └── sample_email.txt - Test email
│   └── output/
│       └── (Place entity_analysis.json here)
│
└── gpt4/
    ├── README.md - Complex analysis instructions
    ├── input/
    │   └── sample_email.txt - Test email
    └── output/
        └── (Place complex_analysis.json here)

## Testing Process
1. For each LLM:
   - Read the LLM's README.md for prompt instructions
   - Use the input file from input/
   - Run the prompt manually
   - Save the output to output/ with the specified filename

2. After collecting all outputs:
   - The system will combine the analyses
   - Results will be processed through the pipeline
   - Final output will show integrated analysis

## Expected Files

### NotebookLM (Timeline Analysis)
- Input: notebooklm/input/sample_email.txt
- Output: notebooklm/output/timeline_analysis.json
- Focus: Chronological events, time periods, temporal relationships

### Sonnet (Semantic Understanding)
- Input: sonnet/input/sample_email.txt
- Output: sonnet/output/semantic_analysis.json
- Focus: Topics, entities, relationships, patterns

### Deepseek (Entity Extraction)
- Input: deepseek/input/sample_email.txt
- Output: deepseek/output/entity_analysis.json
- Focus: Named entities, attributes, cross-references

### GPT-4 (Complex Analysis)
- Input: gpt4/input/sample_email.txt
- Output: gpt4/output/complex_analysis.json
- Focus: Patterns, insights, implications, anomalies

## Notes
- Each LLM has specific output format requirements
- Follow the JSON schemas exactly
- Include all required fields and metadata
- Maintain consistent date formats (YYYY-MM-DD)
- Provide confidence scores for all extractions
- Include context where specified
