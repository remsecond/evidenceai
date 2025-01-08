# Input/output paths
$inputPath = Join-Path $PSScriptRoot ".." "test-data" "OFW_Messages_Report_Dec.pdf"
$outputDir = Join-Path $PSScriptRoot ".." "test-data" "processed"
$llmInputDir = Join-Path $outputDir "llm-input"
$rawDir = Join-Path $outputDir "raw"
$textPath = Join-Path $rawDir "extracted-text.txt"

# Create directories
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $llmInputDir | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null

Write-Host "Opening Word..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false

Write-Host "Opening PDF..."
$doc = $word.Documents.Open($inputPath)

Write-Host "Extracting text..."
$text = $doc.Content.Text

Write-Host "Saving raw text..."
$text | Out-File -FilePath $textPath -Encoding utf8

Write-Host "Creating chunks..."
$maxSize = 100000
$chunks = @()
$currentChunk = ""

$text -split "`n\s*`n" | ForEach-Object {
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

Write-Host "Cleaning up..."
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null

Write-Host "Done!"
Write-Host "- Raw text saved to: $textPath"
Write-Host "- Created $($chunks.Count) chunks in: $llmInputDir"
