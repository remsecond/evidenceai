# EvidenceAI

Advanced document analysis system specializing in legal document processing, pattern detection, and timeline generation.

## Project Structure

```
evidenceai/
├── docs/               # Documentation
│   ├── architecture/   # System architecture
│   └── planning/       # Project planning
├── src/               # Source code
│   ├── core/          # Core functionality
│   └── services/      # Service implementations
├── scripts/           # Utility scripts
└── test-data/         # Test data directory
```

## Development Workflow

### Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `release/*`: Release preparation
- `hotfix/*`: Production fixes

### Version Tags

- `v0.1.0`: Initial release with context management
- `v0.1.0-context`: Context management implementation

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
cd evidenceai
```

2. Initialize development environment:
```bash
# From Desktop
start_dev.bat
```

This will:
- Load project context
- Initialize development environment
- Start VSCode with proper configuration

## Development Guidelines

1. Branch Creation:
```bash
# For new features
git checkout develop
git checkout -b feature/your-feature

# For releases
git checkout develop
git checkout -b release/v1.x.x

# For hotfixes
git checkout main
git checkout -b hotfix/issue-description
```

2. Commit Messages:
```
feat: Add new feature
fix: Fix specific issue
docs: Update documentation
chore: Maintenance tasks
refactor: Code refactoring
test: Add/update tests
```

3. Pull Request Process:
- Create PR against `develop` for features
- Create PR against `main` for hotfixes
- Require review before merge
- Delete branch after merge

## Project Context

The project context is maintained in PROJECT_CONTEXT.md and includes:
- Current project state
- Implementation status
- Development priorities
- Role definitions

## MCP Servers

Connected Model Context Protocol servers:
- pdf-server: PDF processing
- chatsum: Text analysis
- deepseek: Entity extraction
- neo4j: Graph database

## Current Status

- Phase: Implementation Phase 1
- Focus: Core feature completion
- Current Sprint: Context Management

## Development Environment

Required tools:
- Node.js 18.x
- VSCode
- Git
- PowerShell 7+

## Documentation

- `/docs/architecture/`: System design and architecture
- `/docs/planning/`: Project planning and roadmap
- `PROJECT_CONTEXT.md`: Current project state
- Development guidelines in `/docs/development_guidelines.md`

## Scripts

- `start_dev.bat`: Initialize development environment
- `init_context.bat`: Load project context
- `init_context.ps1`: PowerShell context loader
- `init_repo.bat`: Initialize Git repository

## Contributing

1. Create feature branch from `develop`
2. Implement changes
3. Create pull request
4. Address review comments
5. Merge to `develop`

## License

Proprietary - All rights reserved
