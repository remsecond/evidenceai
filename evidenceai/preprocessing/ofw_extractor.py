import os
from typing import Dict, Any, Optional
from .correlation import ContentCorrelator
from .logging import ExtractionLogger

class OFWExtractor:
    """Enhanced OFW message extraction with correlation tracking."""
    
    def __init__(self, logger: ExtractionLogger):
        self.logger = logger
        self.correlator = ContentCorrelator(logger.log_file)
        
    def extract_text(self, ofw_path: str) -> str:
        """Extract text from OFW message file."""
        text = ""
        
        try:
            # Read OFW file content
            with open(ofw_path, 'r', encoding='utf-8') as file:
                text = file.read()
                
            # Clean and normalize text
            text = self._clean_text(text)
            
            # Log content for correlation
            content = {'text': text}
            self.correlator.log_content('ofw', ofw_path, content)
            
            # Find correlations
            correlations = self.correlator.find_correlations(text)
            if correlations:
                self.logger.log_correlations(correlations)
                
        except Exception as e:
            self.logger.log_error(f"OFW extraction failed: {str(e)}")
            raise
            
        return text
        
    def extract_metadata(self, ofw_path: str) -> Dict[str, Any]:
        """Extract OFW metadata."""
        metadata = {
            'filename': os.path.basename(ofw_path),
            'filesize': os.path.getsize(ofw_path)
        }
        
        try:
            # Extract message-specific metadata
            with open(ofw_path, 'r', encoding='utf-8') as file:
                content = file.read()
                
                # Try to extract message date
                date_line = next((line for line in content.split('\n') 
                                if line.strip().startswith('Date:')), None)
                if date_line:
                    metadata['message_date'] = date_line.split(':', 1)[1].strip()
                    
                # Try to extract sender
                from_line = next((line for line in content.split('\n')
                                if line.strip().startswith('From:')), None)
                if from_line:
                    metadata['sender'] = from_line.split(':', 1)[1].strip()
                    
        except Exception as e:
            self.logger.log_error(f"OFW metadata extraction failed: {str(e)}")
            
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
