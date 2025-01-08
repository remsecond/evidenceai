@echo off
echo Initializing EvidenceAI Git Repository...

:: Initialize repository
cd ..
git init
git add .
git commit -m "Initial commit: Project foundation"

:: Create and configure main branch
git branch -M main
git commit --allow-empty -m "chore: Initialize main branch"

:: Create development branch
git checkout -b develop
git commit --allow-empty -m "chore: Initialize development branch"

:: Create feature branch for context management
git checkout -b feature/context-management
git add PROJECT_CONTEXT.md init_context.bat init_context.ps1 start_dev.bat evidenceai.code-workspace
git commit -m "feat: Add context management system"

:: Tag context management implementation
git tag -a v0.1.0-context -m "Context Management Implementation"

:: Switch back to develop and merge feature
git checkout develop
git merge feature/context-management --no-ff -m "feat: Merge context management system"

:: Switch to main and merge develop
git checkout main
git merge develop --no-ff -m "release: v0.1.0 Context Management"

:: Create release tag
git tag -a v0.1.0 -m "Initial Release with Context Management"

:: Add GitHub remote and push
echo.
echo Please enter the GitHub repository URL:
set /p REPO_URL=
git remote add origin %REPO_URL%

:: Push all branches and tags
git push -u origin main
git push origin develop
git push origin feature/context-management
git push --tags

echo.
echo Repository initialized and pushed to GitHub:
echo Main branch: Production-ready code
echo Develop branch: Integration branch
echo Feature branch: Context management implementation
echo Tags: v0.1.0-context, v0.1.0

:: Return to develop branch for continued development
git checkout develop
echo.
echo Switched to develop branch for continued development.
