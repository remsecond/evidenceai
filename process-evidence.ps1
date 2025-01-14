# EvidenceAI Processing Tool
Write-Host "EvidenceAI Processing Tool`n" -ForegroundColor Cyan

# Check if input file was provided
if (-not $args[0]) {
    Write-Host "Error: Please provide an input file" -ForegroundColor Red
    Write-Host "Usage: .\process-evidence.ps1 [file]"
    Write-Host "Example: .\process-evidence.ps1 evidence.txt"
    exit 1
}

$inputFile = $args[0]

# Check if file exists
if (-not (Test-Path $inputFile)) {
    Write-Host "Error: File not found: $inputFile" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Found Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is required but not found" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    try {
        npm install
    } catch {
        Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

# Create output directories if they don't exist
if (-not (Test-Path "processed")) {
    New-Item -ItemType Directory -Path "processed" | Out-Null
}

# Process the evidence file
Write-Host "`nProcessing $inputFile...`n" -ForegroundColor Yellow

try {
    node scripts/process-evidence.js $inputFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nProcessing completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nProcessing failed with error code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "`nProcessing failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
