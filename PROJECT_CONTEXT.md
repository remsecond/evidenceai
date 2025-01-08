# EvidenceAI Project Context

## Project Overview
EvidenceAI is an advanced document analysis and pattern recognition platform designed for broad application across multiple domains. While initially focused on family law document processing, the system is architected to expand into employment law, civil litigation, healthcare, and corporate compliance.

### Core Capabilities
- Document processing and analysis
- Pattern detection and timeline generation
- AI-powered insights
- Multi-domain adaptability
- Integration capabilities

### Target Domains
1. Legal
   - Family law (initial focus)
   - Employment law
   - Civil litigation
   - Contract disputes

2. Healthcare
   - Medical records
   - Insurance claims
   - Treatment timelines

3. Corporate
   - Regulatory compliance
   - Internal investigations
   - Risk management

## Development Manager Role
As the Development Manager for EvidenceAI, responsibilities include:
- Overseeing technical implementation
- Managing development milestones
- Ensuring architectural consistency
- Coordinating between services
- Maintaining technical standards

## Current Project State (Updated: December 2023)

### Implementation Status
1. Core Services:
- Document Processing: 70% complete
  * PDF extraction working (multiple methods)
  * Text analysis integrated
  * Chunking implemented
  * Multi-format support
- AI Integration: 60% complete
  * GPT-4 via chatsum for general analysis
  * Deepseek for entity recognition
  * Pattern detection in progress
  * Timeline generation capabilities
- Storage System: 40% complete
  * Local storage working
  * Cloud integration pending
  * PostgreSQL integration planned
  * Data exchange formats defined

2. Domain Implementation:
- Family Law: Base implementation
  * OFW processing complete
  * Timeline generation working
  * Pattern analysis active
- Additional Domains: In planning
  * Employment law templates defined
  * Healthcare integration designed
  * Corporate compliance framework outlined

2. MCP Servers:
- pdf-server: Operational
- chatsum: Operational
- deepseek: Operational
- neo4j: In development

### Current Milestone: Phase 1
- Timeline: Q4 2023 - Q1 2024
- Focus: Core feature implementation
- Key Deliverables:
  * Document processing pipeline
  * AI analysis integration
  * Basic timeline generation
  * Initial pattern detection

### Next Milestones
1. Q1 2024:
- Complete core features
- Launch beta testing
- Implement feedback system

2. Q2 2024:
- Enhanced pattern detection
- Advanced visualization
- Collaboration features

## Project Resources
- Main Repository: evidenceai/
- Documentation: evidenceai/docs/
- MCP Servers: Documents/Cline/MCP/
- Test Data: evidenceai/test-data/
- Domain Templates: evidenceai/templates/
- Integration APIs: evidenceai/api/
- Analysis Patterns: evidenceai/patterns/

## Technical Stack
- Backend: Node.js/Express
- AI: GPT-4, Deepseek
- Storage: Local + Google Drive
- Database: PostgreSQL (planned)
- Queue: Bull (planned)

## Processing Pipeline

### 1. Document Ingestion
- PDF Server (MCP):
  * Text extraction and validation
  * Metadata parsing
  * Format detection
- Specialized Processors:
  * Email thread reconstruction
  * OFW message analysis
  * Document routing

### 2. Content Processing
- Chunking Service:
  * 150k token maximum chunks
  * 10% context overlap
  * Parallel processing support
- Analysis Services:
  * Chatsum (GPT-4): Analysis and summaries
  * Deepseek: Entity extraction
  * Pattern detection engine

### 3. Data Organization
- Neo4j Server:
  * Entity storage
  * Relationship graphs
  * Pattern analysis
  * Query interface
- Storage Service:
  * File management
  * Version control
  * Access control
  * Metadata storage

### 4. Analysis & Enrichment
- Pattern Detection:
  * Communication patterns
  * Behavioral analysis
  * Temporal patterns
  * Relationship mapping
- Output Generation:
  * Timeline creation
  * Report generation
  * Visualization tools

### Pipeline Configuration
- Error Handling:
  * Retry mechanism with exponential backoff
  * Fallback processing options
  * Error tracking and reporting
- Performance:
  * Multi-level caching (memory, Redis, disk)
  * Queue management and prioritization
  * Auto-scaling configuration
- Monitoring:
  * Performance metrics tracking
  * Quality metrics analysis
  * Resource utilization monitoring

## Development Guidelines
1. Code Organization:
- MCP pattern for complex operations
- Service abstraction for core features
- Proper error handling
- Comprehensive testing

2. Documentation:
- Keep technical docs updated
- Document architectural decisions
- Maintain API documentation
- Update this context file

## Current Priorities
1. Immediate:
- Complete PDF processing pipeline
- Finalize AI integration
- Implement timeline generation
- Validate base case (family law)

2. Short-term:
- Enhanced pattern detection
- Cross-domain templates
- API platform development
- Integration capabilities

3. Medium-term:
- Domain expansion
- Advanced analytics
- Partner integrations
- Vertical solutions

## Role-Specific Context
As Development Manager, current focus areas:
1. Technical Leadership:
- Guide architectural decisions
- Review implementation approaches
- Ensure quality standards
- Maintain technical vision

2. Project Management:
- Track milestone progress
- Coordinate team efforts
- Manage technical debt
- Plan future phases

3. Quality Assurance:
- Oversee testing strategy
- Monitor performance
- Ensure security standards
- Validate implementations

## Context Management
This document should be:
1. Updated with significant changes
2. Referenced at project initialization
3. Used for role context setting
4. Maintained alongside code
5. Version controlled with project

## Project History
- Q3 2023: Initial concept and planning
- Q4 2023: Core development started
- Current: Phase 1 implementation
- Next: Beta testing preparation

## Success Metrics
1. Technical:
- Processing speed: <30s per document
- Analysis accuracy: >90%
- System uptime: 99.9%
- Error rate: <1%

2. Development:
- Sprint completion rate
- Code quality metrics
- Test coverage
- Documentation completeness

## Notes
- This document serves as the source of truth for project context
- Update this file with major developments
- Use for context initialization
- Reference for project decisions
