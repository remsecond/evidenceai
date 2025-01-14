# Contributing to EvidenceAI

Thank you for your interest in contributing to EvidenceAI! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Branch Naming

- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Performance improvements: `perf/description`

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code
- refactor: Code change that neither fixes a bug nor adds a feature
- perf: Code change that improves performance
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools

## Testing

- Write tests for new features
- Update tests for bug fixes
- Ensure all tests pass before submitting PR
- Follow existing test patterns

## Code Style

- Use ESLint and Prettier configurations
- Follow TypeScript best practices
- Keep functions focused and small
- Write clear, descriptive comments
- Use meaningful variable names

## Documentation

- Update README.md if needed
- Document new features
- Update API documentation
- Include JSDoc comments for functions
- Update CHANGELOG.md

## Pull Request Process

1. Update documentation
2. Add tests for new features
3. Update CHANGELOG.md
4. Ensure CI passes
5. Get review from maintainers
6. Address review feedback
7. Squash commits if requested

## Setting Up Development Environment

1. Install dependencies:
```bash
npm install
python -m pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Configure Google integration:
```bash
node scripts/setup-google-project.js
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:core-pipeline
npm run test:format-handling
npm run test:smart-chunking
```

## Getting Help

- Check existing issues
- Read documentation in /docs
- Ask questions in discussions
- Join our community chat

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
