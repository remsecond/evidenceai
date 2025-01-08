# Enable detailed error messages
$ErrorActionPreference = "Stop"

function Write-Log {
    param($Message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message"
}

try {
    Write-Log "Setting up paths..."
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $inputPath = Join-Path $scriptPath ".." "test-data" "OFW_Messages_Report_Dec.pdf"
    $outputDir = Join-Path $scriptPath ".." "test-data" "processed"
    $llmInputDir = Join-Path $outputDir "llm-input"
    $rawDir = Join-Path $outputDir "raw"
    $textPath = Join-Path $rawDir "extracted-text.txt"

    Write-Log "Input PDF: $inputPath"
    Write-Log "Output directory: $outputDir"

    # Verify input file exists
    if (-not (Test-Path $inputPath)) {
        throw "PDF file not found: $inputPath"
    }
    Write-Log "Found input PDF file"

    # Create output directories
    Write-Log "Creating output directories..."
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    New-Item -ItemType Directory -Force -Path $llmInputDir | Out-Null
    New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
    Write-Log "Created output directories"

    # Start Word
    Write-Log "Starting Word..."
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    Write-Log "Word started successfully"

    try {
        Write-Log "Opening PDF..."
        $absPath = (Get-Item $inputPath).FullName
        $doc = $word.Documents.Open($absPath)
        Write-Log "PDF opened successfully"

        Write-Log "Extracting text..."
        $text = $doc.Content.Text
        Write-Log "Text extracted successfully"

        Write-Log "Saving raw text..."
        $text | Out-File -FilePath $textPath -Encoding utf8
        Write-Log "Raw text saved to: $textPath"

        Write-Log "Creating chunks..."
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

        Write-Log "Saving chunks..."
        for ($i = 0; $i -lt $chunks.Count; $i++) {
            $chunkPath = Join-Path $llmInputDir ("chunk-{0:D3}.txt" -f ($i + 1))
            $chunks[$i] | Out-File -FilePath $chunkPath -Encoding utf8
        }

        Write-Log "Processing complete!"
        Write-Log "- Raw text: $textPath"
        Write-Log "- Created $($chunks.Count) chunks in: $llmInputDir"

    } finally {
        Write-Log "Cleaning up..."
        if ($doc) {
            $doc.Close()
        }
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    }

} catch {
    Write-Error "Error occurred: $_"
    Write-Error $_.ScriptStackTrace
    exit 1
}
