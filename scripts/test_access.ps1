Write-Host "Testing file access..."
$pdfPath = Join-Path $PSScriptRoot ".." "test-data" "OFW_Messages_Report_Dec.pdf"
$outputDir = Join-Path $PSScriptRoot ".." "test-data" "processed"

Write-Host "PDF path: $pdfPath"
Write-Host "Output directory: $outputDir"

if (Test-Path $pdfPath) {
    Write-Host "PDF file exists"
    $fileInfo = Get-Item $pdfPath
    Write-Host "File size: $($fileInfo.Length) bytes"
    Write-Host "Last modified: $($fileInfo.LastWriteTime)"
    Write-Host "File attributes: $($fileInfo.Attributes)"
} else {
    Write-Host "PDF file not found"
}

if (-not (Test-Path $outputDir)) {
    Write-Host "Creating output directory..."
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "Testing write access..."
$testFile = Join-Path $outputDir "test.txt"
try {
    "Test content" | Out-File -FilePath $testFile -Encoding utf8
    Write-Host "Successfully wrote test file"
    Remove-Item $testFile
    Write-Host "Successfully removed test file"
} catch {
    Write-Host "Error writing to output directory: $_"
}
