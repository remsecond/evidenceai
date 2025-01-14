import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import PyPDF2
from pdfminer.high_level import extract_text as pdfminer_extract
from pdfminer.layout import LAParams

class PDFExtractor:
    def __init__(self, logger=None):
        self.logger = logger
        self.correlations = []

    def extract_text(self, file_path: str) -> str:
        """Extract text from PDF using PyPDF2 first, falling back to pdfminer for complex documents."""
        try:
            # Try PyPDF2 first
            text = self._extract_with_pypdf2(file_path)
            if text and len(text.strip()) > 0:
                return text
            
            # Fall back to pdfminer if PyPDF2 fails or returns empty text
            return self._extract_with_pdfminer(file_path)
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error extracting text from {file_path}: {str(e)}")
            raise

    def _extract_with_pypdf2(self, file_path: str) -> str:
        """Extract text using PyPDF2."""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            if self.logger:
                self.logger.debug(f"PyPDF2 extraction failed for {file_path}: {str(e)}")
            return ""

    def _extract_with_pdfminer(self, file_path: str) -> str:
        """Extract text using pdfminer."""
        try:
            laparams = LAParams(
                line_margin=0.5,
                word_margin=0.1,
                char_margin=2.0,
                boxes_flow=0.5,
                detect_vertical=True
            )
            return pdfminer_extract(file_path, laparams=laparams)
        except Exception as e:
            if self.logger:
                self.logger.error(f"pdfminer extraction failed for {file_path}: {str(e)}")
            raise

    def extract_metadata(self, file_path: str) -> Dict:
        """Extract metadata from PDF."""
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                info = reader.metadata
                if info:
                    return {
                        'title': info.get('/Title', ''),
                        'author': info.get('/Author', ''),
                        'subject': info.get('/Subject', ''),
                        'creator': info.get('/Creator', ''),
                        'producer': info.get('/Producer', ''),
                        'creation_date': info.get('/CreationDate', ''),
                        'modification_date': info.get('/ModDate', ''),
                        'pages': len(reader.pages)
                    }
                return {}
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error extracting metadata from {file_path}: {str(e)}")
            return {}

    def find_correlations(self, file_path: str, processed_files: List[str], threshold: float = 0.7) -> List[Dict]:
        """Find correlations between the current file and previously processed files."""
        correlations = []
        try:
            current_text = self.extract_text(file_path)
            
            for other_file in processed_files:
                if other_file == file_path:
                    continue
                    
                try:
                    other_text = self.extract_text(other_file)
                    similarity = self._calculate_similarity(current_text, other_text)
                    
                    if similarity >= threshold:
                        correlation = {
                            'file1': file_path,
                            'file2': other_file,
                            'confidence': similarity,
                            'timestamp': datetime.now().isoformat()
                        }
                        correlations.append(correlation)
                        
                        if self.logger:
                            self.logger.info(f"Found correlation: {json.dumps(correlation)}")
                except Exception as e:
                    if self.logger:
                        self.logger.error(f"Error processing correlation file {other_file}: {str(e)}")
                    continue
                    
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error finding correlations for {file_path}: {str(e)}")
        
        return correlations

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text documents."""
        # Simple word overlap similarity for now
        # Could be enhanced with more sophisticated methods
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)

    def get_correlation_stats(self) -> Dict:
        """Get statistics about found correlations."""
        if not self.correlations:
            return {'correlation_clusters': []}
            
        # Group correlations into clusters
        clusters = []
        processed = set()
        
        for corr in self.correlations:
            if corr['file1'] in processed or corr['file2'] in processed:
                continue
                
            cluster = {
                'files': [corr['file1'], corr['file2']],
                'confidence': corr['confidence'],
                'size': 2
            }
            
            # Find other files that correlate with either file
            for other_corr in self.correlations:
                if other_corr == corr:
                    continue
                    
                if (other_corr['file1'] in cluster['files'] or 
                    other_corr['file2'] in cluster['files']):
                    new_file = (other_corr['file2'] 
                              if other_corr['file1'] in cluster['files']
                              else other_corr['file1'])
                    if new_file not in cluster['files']:
                        cluster['files'].append(new_file)
                        cluster['size'] += 1
                        cluster['confidence'] = min(
                            cluster['confidence'],
                            other_corr['confidence']
                        )
            
            clusters.append(cluster)
            processed.update(cluster['files'])
            
        return {
            'correlation_clusters': sorted(
                clusters,
                key=lambda x: (-x['size'], -x['confidence'])
            )
        }
