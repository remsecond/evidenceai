# EvidenceAI Development Context Initializer

# Set console colors for better readability
$host.UI.RawUI.BackgroundColor = "Black"
$host.UI.RawUI.ForegroundColor = "White"
Clear-Host

# Project configuration
$config = @{
    ProjectName = "EvidenceAI"
    Role = "Development Manager"
    Phase = "Phase 1"
    Milestone = "Core Implementation"
    ProjectRoot = $PSScriptRoot
    RequiredTools = @(
        @{Name = "Node.js"; Command = "node --version"},
        @{Name = "Git"; Command = "git --version"},
        @{Name = "VSCode"; Command = "code --version"}
    )
}

# Function to check required tools
function Test-RequiredTools {
    $allToolsPresent = $true
    Write-Host "`nChecking required tools..." -ForegroundColor Cyan
    foreach ($tool in $config.RequiredTools) {
        try {
            $version = Invoke-Expression $tool.Command
            Write-Host "$($tool.Name): $version" -ForegroundColor Green
        } catch {
            Write-Host "$($tool.Name): Not found" -ForegroundColor Red
            $allToolsPresent = $false
        }
    }
    return $allToolsPresent
}

# Function to validate environment
function Test-Environment {
    $valid = $true
    
    # Check if PROJECT_CONTEXT.md exists
    if (-not (Test-Path (Join-Path $config.ProjectRoot "PROJECT_CONTEXT.md"))) {
        Write-Host "ERROR: PROJECT_CONTEXT.md not found" -ForegroundColor Red
        $valid = $false
    }
    
    # Check if .vscode directory exists
    if (-not (Test-Path (Join-Path $config.ProjectRoot ".vscode"))) {
        Write-Host "WARNING: .vscode directory not found" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path (Join-Path $config.ProjectRoot ".vscode") | Out-Null
    }
    
    # Check Git repository
    if (-not (Test-Path (Join-Path $config.ProjectRoot ".git"))) {
        Write-Host "WARNING: Git repository not initialized" -ForegroundColor Yellow
    }
    
    return $valid
}

# Function to display formatted sections
function Write-Section {
    param($Title, $Content)
    Write-Host ("`n" + "=" * 50) -ForegroundColor Cyan
    Write-Host "   $Title" -ForegroundColor Cyan
    Write-Host ("=" * 50) -ForegroundColor Cyan
    if ($Content) {
        Write-Host $Content
    }
}

# Function to display progress
function Write-Progress {
    param($Component, $Percentage)
    $bar = "[" + ("=" * [math]::Floor($Percentage/2)) + (" " * [math]::Floor((100-$Percentage)/2)) + "]"
    Write-Host "$Component : $bar $Percentage%" -ForegroundColor Yellow
}

# Display header
$header = @"
 _____       _     _                      _    _ 
|  ___|_   _(_) __| | ___ _ __   ___ ___| |  / \  
| |__  \ \ / / |/ _` |/ _ \ '_ \ / __/ _ \ | /  /
|  __|  \ V /| | (_| |  __/ | | | (_|  __/ |/ /_
|_____|  \_/ |_|\__,_|\___|_| |_|\___\___|_/_/(_)
"@
Write-Host $header -ForegroundColor Green
Write-Host "Initializing Development Environment" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green

# Load and display project context
Write-Section "Project Context" "Loading from PROJECT_CONTEXT.md..."
$contextPath = Join-Path $config.ProjectRoot "PROJECT_CONTEXT.md"
if (Test-Path $contextPath) {
    Get-Content $contextPath | ForEach-Object {
        if ($_ -match "^#") {
            Write-Host $_ -ForegroundColor Magenta
        } else {
            Write-Host $_
        }
    }
}

# Display implementation status
Write-Section "Pipeline Status" ""
Write-Progress "Document Ingestion" 75
Write-Progress "Content Processing" 65
Write-Progress "Data Organization" 50
Write-Progress "Analysis & Enrichment" 45

Write-Section "Domain Status" ""
Write-Progress "Family Law (Base Case)" 85
Write-Progress "Employment Law" 20
Write-Progress "Healthcare" 15
Write-Progress "Corporate Compliance" 10

Write-Section "Component Status" ""
Write-Progress "PDF Server" 90
Write-Progress "Chatsum Integration" 80
Write-Progress "Deepseek Integration" 75
Write-Progress "Neo4j Integration" 40

Write-Section "Infrastructure Status" ""
Write-Progress "Error Handling" 70
Write-Progress "Caching System" 60
Write-Progress "Queue Management" 50
Write-Progress "Monitoring" 55

# Display environment info
Write-Section "Development Environment" @"
Role: $($config.Role)
Project: $($config.ProjectName)
Phase: $($config.Phase)
Milestone: $($config.Milestone)
Project Root: $($config.ProjectRoot)
"@

# Check Git status
Write-Section "Git Status" ""
git status

# Display current priorities
Write-Section "Current Development Priorities" @"
Immediate:
1. Complete PDF processing pipeline
2. Finalize AI integration
3. Implement timeline generation
4. Validate base case (family law)

Short-term:
1. Enhanced pattern detection
2. Cross-domain templates
3. API platform development
4. Integration capabilities

Medium-term:
1. Domain expansion
2. Advanced analytics
3. Partner integrations
4. Vertical solutions
"@

# Instructions for Claude
Write-Section "Instructions for Claude" @"
Role: Development Manager for EvidenceAI
Context: PROJECT_CONTEXT.md loaded
Current Phase: Implementation Phase 1
Focus: Core feature completion
"@

# Validate environment and tools
$envValid = Test-Environment
$toolsValid = Test-RequiredTools

if (-not ($envValid -and $toolsValid)) {
    Write-Host "`nEnvironment validation failed. Please fix the issues above." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Wait for acknowledgment
Write-Host "`nEnvironment initialized successfully!" -ForegroundColor Green
Write-Host "Press any key to continue development..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
