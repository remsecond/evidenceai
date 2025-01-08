@echo off
echo Starting PDF text extraction...
echo.

set PDF_PATH=%~dp0..\test-data\OFW_Messages_Report_Dec.pdf
set OUTPUT_DIR=%~dp0..\test-data\processed
set RAW_DIR=%OUTPUT_DIR%\raw
set LLM_DIR=%OUTPUT_DIR%\llm-input
set TEXT_PATH=%RAW_DIR%\extracted-text.txt

echo Input PDF: %PDF_PATH%
echo Output directory: %OUTPUT_DIR%
echo.

if not exist "%PDF_PATH%" (
    echo ERROR: PDF file not found: %PDF_PATH%
    exit /b 1
)
echo Found input PDF file

echo Creating output directories...
mkdir "%OUTPUT_DIR%" 2>nul
mkdir "%RAW_DIR%" 2>nul
mkdir "%LLM_DIR%" 2>nul
echo Created output directories

echo Extracting text from PDF...
python -m pdfminer.tools.pdf2txt -o "%TEXT_PATH%" "%PDF_PATH%"
if errorlevel 1 (
    echo ERROR: Failed to extract text from PDF
    exit /b 1
)

echo Text extraction complete
echo Raw text saved to: %TEXT_PATH%

echo Done!
