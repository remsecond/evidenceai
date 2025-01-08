# Download xpdf tools
$xpdfUrl = "https://dl.xpdfreader.com/xpdf-tools-win-4.04.zip"
$downloadPath = Join-Path $env:TEMP "xpdf-tools.zip"
$extractPath = Join-Path $env:TEMP "xpdf-tools"
$toolsPath = Join-Path $extractPath "xpdf-tools-win-4.04\bin64"

Write-Host "Downloading xpdf tools..."
Invoke-WebRequest -Uri $xpdfUrl -OutFile $downloadPath

Write-Host "Extracting..."
Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force

# Set up paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$inputPath = Join-Path $scriptPath ".." "test-data" "OFW_Messages_Report_Dec.pdf"
$outputDir = Join-Path $scriptPath ".." "test-data" "processed"
$llmInputDir = Join-Path $outputDir "llm-input"
$rawDir = Join-Path $outputDir "raw"
$textPath = Join-Path $rawDir "extracted-text.txt"

Write-Host "Creating directories..."
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $llmInputDir | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null

Write-Host "Extracting text from PDF..."
$pdfToText = Join-Path $toolsPath "pdftotext.exe"
& $pdfToText -layout -nopgbrk $inputPath $textPath

if (Test-Path $textPath) {
    Write-Host "Reading extracted text..."
    $text = Get-Content -Path $textPath -Raw

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

    Write-Host "Saving chunks..."
    for ($i = 0; $i -lt $chunks.Count; $i++) {
        $chunkPath = Join-Path $llmInputDir ("chunk-{0:D3}.txt" -f ($i + 1))
        $chunks[$i] | Out-File -FilePath $chunkPath -Encoding utf8
    }

    Write-Host "Processing complete!"
    Write-Host "- Raw text: $textPath"
    Write-Host "- Created $($chunks.Count) chunks in: $llmInputDir"
} else {
    Write-Error "Failed to extract text from PDF"
    exit 1
}

# Clean up
Write-Host "Cleaning up..."
Remove-Item -Path $downloadPath -Force
Remove-Item -Path $extractPath -Recurse -Force
