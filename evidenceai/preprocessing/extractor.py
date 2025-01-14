import os
from typing import Dict, Any, Optional
import PyPDF2
from pdfminer.high_level import extract_text as pdfminer_extract
from .correlation import ContentCorrelator
from .logging import ExtractionLogger

class PDFExtractor:
    """Enhanced PDF text extraction with correlation tracking."""
    
    def __init__(self, logger: ExtractionLogger):
        self.logger = logger
        self.correlator = ContentCorrelator(logger.log_file)
        
    def extract_text(self, pdf_path: str) -> str:
        """Extract text from PDF using multiple methods."""
        text = ""
        
        # First try PyPDF2
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            self.logger.log_error(f"PyPDF2 extraction failed: {str(e)}")
            
            # Fallback to pdfminer
            try:
                text = pdfminer_extract(pdf_path)
            except Exception as e:
                self.logger.log_error(f"pdfminer extraction failed: {str(e)}")
                raise
                
        # Clean and normalize text
        text = self._clean_text(text)
        
        # Log content for correlation
        content = {'text': text}
        self.correlator.log_content('pdf', pdf_path, content)
        
        # Find correlations
        correlations = self.correlator.find_correlations(text)
        if correlations:
            self.logger.log_correlations(correlations)
            
        return text
        
    def extract_metadata(self, pdf_path: str) -> Dict[str, Any]:
        """Extract PDF metadata."""
        metadata = {}
        
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                metadata = reader.metadata
                if metadata:
                    # Convert from DocumentInformation to dict
                    metadata = {k: str(v) for k, v in metadata.items()}
                    
                # Add basic file info
                metadata.update({
                    'pages': len(reader.pages),
                    'filename': os.path.basename(pdf_path),
                    'filesize': os.path.getsize(pdf_path)
                })
        except Exception as e:
            self.logger.log_error(f"Metadata extraction failed: {str(e)}")
            
        return metadata
        
    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text."""
        if not text:
            return ""
            
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Basic normalization
        text = text.strip()
        
        return text
        
    def get_correlation_stats(self) -> Dict[str, Any]:
        """Get correlation statistics."""
        return self.correlator.get_correlation_stats()
