# Input/output paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$inputPath = Join-Path $scriptPath ".." "test-data" "OFW_Messages_Report_Dec.pdf"
$outputDir = Join-Path $scriptPath ".." "test-data" "processed"
$llmInputDir = Join-Path $outputDir "llm-input"
$rawDir = Join-Path $outputDir "raw"
$textPath = Join-Path $rawDir "extracted-text.txt"

Write-Host "Input PDF: $inputPath"
Write-Host "Output directory: $outputDir"

# Verify input file exists
if (-not (Test-Path $inputPath)) {
    Write-Error "PDF file not found: $inputPath"
    exit 1
}
Write-Host "Found input PDF file"

# Create output directories
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $llmInputDir | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
Write-Host "Created output directories"

# Find Adobe Reader/Acrobat
$adobePath = "C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe"
if (-not (Test-Path $adobePath)) {
    $adobePath = "C:\Program Files\Adobe\Acrobat DC\Acrobat\Acrobat.exe"
}
if (-not (Test-Path $adobePath)) {
    Write-Error "Adobe Reader/Acrobat not found"
    exit 1
}
Write-Host "Found Adobe at: $adobePath"

# Extract text using Adobe
Write-Host "Extracting text with Adobe..."
$process = Start-Process -FilePath $adobePath -ArgumentList "/A", "SaveAs:filename=$textPath;format=txt", $inputPath -PassThru -Wait
if ($process.ExitCode -ne 0) {
    Write-Error "Adobe extraction failed with code $($process.ExitCode)"
    exit 1
}

# Wait for file to be created
$maxWait = 30
while ($maxWait -gt 0 -and -not (Test-Path $textPath)) {
    Start-Sleep -Seconds 1
    $maxWait--
}

if (-not (Test-Path $textPath)) {
    Write-Error "Text file was not created"
    exit 1
}

# Read extracted text
Write-Host "Reading extracted text..."
$text = Get-Content -Path $textPath -Raw

# Create chunks
Write-Host "Creating chunks..."
$chunks = @()
$currentChunk = ""
$maxSize = 100000

$text -split "`n`n" | ForEach-Object {
    $paragraph = $_
    if (($currentChunk.Length + $paragraph.Length + 2) -gt $maxSize) {
        if ($currentChunk) {
            $chunks += $currentChunk.Trim()
        }
        $currentChunk = $paragraph
    } else {
        if ($currentChunk) {
            $currentChunk = "$currentChunk`n`n$paragraph"
        } else {
            $currentChunk = $paragraph
        }
    }
}
if ($currentChunk) {
    $chunks += $currentChunk.Trim()
}

# Save chunks
Write-Host "Saving $($chunks.Count) chunks..."
for ($i = 0; $i -lt $chunks.Count; $i++) {
    $chunkPath = Join-Path $llmInputDir ("chunk-{0:D3}.txt" -f ($i + 1))
    $chunks[$i] | Out-File -FilePath $chunkPath -Encoding utf8
}

Write-Host "Processing complete!"
Write-Host "- Raw text: $textPath"
Write-Host "- Chunks: $llmInputDir"
