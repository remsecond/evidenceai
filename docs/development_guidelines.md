# EvidenceAI Development Guidelines

## Problem-Solving Framework

### 1. Step Back and Analyze
When facing technical challenges, our first instinct might be to dive straight into implementation. Instead:
- Take a step back and analyze the core problem
- Question if we're solving the right problem
- Look for existing patterns or solutions in our architecture

Example: PDF Processing Challenge
- Initial approach: Direct file operations and parsing
- Problem: Complex, error-prone, and hard to maintain
- Better question: "How can we make PDF processing a reusable, maintainable service?"

### 2. Look for Architectural Patterns

Before creating new solutions, examine our existing architecture for patterns that work:

1. **MCP Server Pattern**
   - Provides clean interfaces for complex operations
   - Handles error cases consistently
   - Easy to extend and maintain
   - Examples: neo4j-server, fetch-server, etc.

2. **Service Abstraction**
   - Encapsulates complex logic
   - Provides clear APIs
   - Makes testing easier
   - Examples: storage.js, local-storage.js

### 3. Evaluate Multiple Approaches

For each challenge, consider multiple solutions:

```markdown
Example: PDF Processing

Approach 1: Direct File Operations
✗ Pros:
  - Simpler initial implementation
  - No additional services needed
✗ Cons:
  - Complex error handling
  - No reusability
  - Hard to maintain
  - Scattered implementation

Approach 2: MCP Server
✓ Pros:
  - Clean, consistent interface
  - Centralized error handling
  - Easy to extend
  - Reusable across project
  - Testable
✓ Cons:
  - Initial setup overhead
  - New service to maintain
```

### 4. Consider Long-term Implications

When evaluating solutions, consider:
- Maintainability
- Scalability
- Testing
- Documentation
- Team onboarding
- Future extensions

### 5. Leverage Existing Tools

Before building custom solutions:
1. Check our existing tools and services
2. Look for established libraries and frameworks
3. Consider adapting existing patterns

Example: PDF Server leverages:
- MCP architecture for service structure
- pdf.js for robust PDF parsing
- TypeScript for type safety
- Existing error handling patterns

## Best Practices

### 1. Service Design
- Keep services focused and single-purpose
- Design clean, intuitive APIs
- Handle errors gracefully and consistently
- Document usage and assumptions

### 2. Code Organization
- Group related functionality
- Use clear, consistent naming
- Follow established patterns
- Keep implementation details encapsulated

### 3. Testing
- Write tests early
- Cover edge cases
- Make services testable by design
- Use dependency injection where appropriate

### 4. Documentation
- Document architectural decisions
- Explain the "why" not just the "what"
- Keep documentation close to code
- Update docs when patterns change

## Example: PDF Processing Evolution

### Initial Challenge
Processing PDFs was becoming complex and error-prone with direct file operations.

### Solution Evolution
1. **Identified Pattern**
   - Noticed similar challenges with other file/service operations
   - Recognized MCP server pattern as successful solution

2. **Designed Service**
   - Created dedicated PDF server
   - Defined clear interface (extract_text, get_metadata, get_page_count)
   - Used established libraries (pdf.js)
   - Followed existing patterns

3. **Implementation Benefits**
   - Clean API for PDF operations
   - Consistent error handling
   - Easy to extend (can add new tools)
   - Maintainable and testable
   - Reusable across project

### Key Takeaways
1. Look for patterns in successful solutions
2. Consider long-term maintenance
3. Design for extension
4. Keep interfaces clean and focused
5. Leverage existing tools and patterns
6. Document decisions and reasoning

## Moving Forward

When facing new challenges:
1. Step back and analyze the core problem
2. Look for existing patterns
3. Consider multiple approaches
4. Think long-term
5. Document decisions
6. Share learnings with the team

Remember: The goal is not just to solve the immediate problem, but to build maintainable, scalable solutions that make future development easier.
