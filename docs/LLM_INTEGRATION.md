# LLM Integration Documentation

## File Structure Overview

### Source Files (src/services/)
1. llm-scoring.js
   - Purpose: Handles scoring and evaluation of LLM responses
   - Key functions: Response quality assessment, confidence scoring
   - Used by: Multi-LLM processor for response ranking

2. multi-llm-processor.js
   - Purpose: Orchestrates multiple LLM models
   - Key functions: Model selection, response aggregation
   - Used by: Main pipeline for enhanced accuracy

3. models/deepseek-processor.js
   - Purpose: DeepSeek model integration
   - Key functions: Model-specific processing, output formatting
   - Used by: Multi-LLM processor

### Test Files (test/unit/)
1. llm-scoring.test.js
   - Purpose: Unit tests for scoring system
   - Coverage: Response evaluation, confidence calculation
   - Key scenarios: Various response types and quality levels

2. multi-llm-processor.test.js
   - Purpose: Integration tests for multi-model processing
   - Coverage: Model coordination, response aggregation
   - Key scenarios: Multiple model interactions

### Prompt Templates (prompts/)
1. roles/PROMPT_TEMPLATES.md
   - Purpose: Defines role-specific prompts
   - Organization: By use case and model type
   - Customization: Model-specific variations

2. Model-Specific Directories
   - deepseek/
   - gpt4/
   - notebooklm/
   - sonnet/

## Model-Specific Optimizations

### DeepSeek
```javascript
// Optimal prompt structure
{
  context: "Detailed background with key points first",
  instruction: "Clear, specific task description",
  format: "Explicit output format specification",
  constraints: ["List of specific constraints"]
}
```

### GPT-4
```javascript
// Optimal prompt structure
{
  system: "Role and capability definition",
  context: "Background information",
  task: "Specific instruction",
  format: "Expected output format",
  examples: ["Few-shot examples if needed"]
}
```

### NotebookLM
```javascript
// Optimal prompt structure
{
  reference: "Source material citation",
  query: "Clear question or task",
  format: "Desired response format",
  constraints: "Processing limitations"
}
```

## Processing Pipeline

### 1. Input Preparation
```javascript
// Example from multi-llm-processor.js
async prepareInput(content, options) {
  const formatted = await this.formatContent(content);
  const enriched = await this.enrichContext(formatted);
  return this.optimizeForModel(enriched, options.model);
}
```

### 2. Model Selection
```javascript
// Example from multi-llm-processor.js
async selectModels(task) {
  return {
    primary: this.determinePrimaryModel(task),
    verification: this.getVerificationModels(task),
    specialization: this.getSpecializedModel(task)
  };
}
```

### 3. Response Processing
```javascript
// Example from llm-scoring.js
async evaluateResponses(responses) {
  const scored = await Promise.all(
    responses.map(this.scoreResponse)
  );
  return this.aggregateScores(scored);
}
```

## Best Practices

### 1. Prompt Engineering
- Start with context and constraints
- Be explicit about output format
- Include validation criteria
- Provide examples for complex tasks

### 2. Model Selection
- Use GPT-4 for complex reasoning
- DeepSeek for technical content
- NotebookLM for research tasks
- Sonnet for creative tasks

### 3. Response Validation
- Check output format compliance
- Validate against constraints
- Verify factual accuracy
- Assess response coherence

## LLM Package Preparation

### 1. File Organization
```
llm-package/
├── models/
│   ├── gpt4/
│   ├── deepseek/
│   ├── notebooklm/
│   └── sonnet/
├── prompts/
│   ├── templates/
│   └── examples/
├── processors/
│   ├── multi-model/
│   └── scoring/
└── validation/
    ├── format/
    └── accuracy/
```

### 2. Documentation Requirements
- Model capabilities and limitations
- Prompt engineering guidelines
- Response validation criteria
- Error handling procedures

### 3. Quality Checks
- Prompt template validation
- Response format verification
- Model-specific optimizations
- Performance benchmarks

## Model-Specific Prompts

### 1. Technical Analysis (DeepSeek)
```markdown
Context: [Technical background]
Task: Analyze and explain [specific aspect]
Format: 
- Key findings
- Technical details
- Recommendations
Constraints: Focus on technical accuracy
```

### 2. Complex Reasoning (GPT-4)
```markdown
System: Expert analyst role
Context: [Situation background]
Task: Evaluate and recommend
Format:
1. Analysis
2. Implications
3. Recommendations
Examples: [Similar cases]
```

### 3. Research Integration (NotebookLM)
```markdown
Reference: [Source material]
Query: Research question
Format: Academic style
- Findings
- Evidence
- Citations
```

## Upload Package Checklist

### 1. Content Verification
- [ ] All prompt templates validated
- [ ] Example responses included
- [ ] Model-specific optimizations documented
- [ ] Error handling scenarios covered

### 2. Structure Validation
- [ ] File organization follows standard
- [ ] Dependencies documented
- [ ] Configuration files included
- [ ] Documentation complete

### 3. Quality Assurance
- [ ] Prompt effectiveness tested
- [ ] Response quality verified
- [ ] Performance benchmarks included
- [ ] Edge cases documented

### 4. Model-Specific Requirements
- [ ] GPT-4 specific formats
- [ ] DeepSeek optimizations
- [ ] NotebookLM integrations
- [ ] Sonnet creative tasks
