import json
import os
from datetime import datetime
from typing import Dict, List, Any

class ExtractionLogger:
    """Enhanced logging system for extraction and correlation tracking."""
    
    def __init__(self, log_file: str, correlation_log: str):
        self.log_file = log_file
        self.correlation_log = correlation_log
        self._ensure_log_files()
        
    def _ensure_log_files(self) -> None:
        """Ensure log files and directories exist."""
        for file_path in [self.log_file, self.correlation_log]:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            if not os.path.exists(file_path):
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write('')  # Create empty file
                    
    def log_extraction(self, source_path: str, text_length: int, metadata: Dict[str, Any]) -> None:
        """Log successful text extraction."""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event': 'extraction',
            'source_path': source_path,
            'text_length': text_length,
            'metadata': metadata
        }
        self._write_log(entry)
        
    def log_error(self, error_message: str) -> None:
        """Log extraction or processing error."""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event': 'error',
            'message': error_message
        }
        self._write_log(entry)
        
    def log_correlations(self, correlations: List[Dict[str, Any]]) -> None:
        """Log correlation results."""
        for correlation in correlations:
            entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'event': 'correlation',
                'match_type': correlation['match_type'],
                'confidence': correlation['confidence'],
                'source': {
                    'type': correlation['source']['source_type'],
                    'path': correlation['source']['source_path']
                },
                'iteration': correlation['iteration']
            }
            
            if 'matched_phrases' in correlation:
                entry['matched_phrases'] = correlation['matched_phrases']
                
            self._write_correlation_log(entry)
            
    def get_correlations(self, text: str) -> List[Dict[str, Any]]:
        """Get existing correlations for text."""
        correlations = []
        
        if os.path.exists(self.correlation_log):
            with open(self.correlation_log, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        if entry['event'] == 'correlation':
                            correlations.append(entry)
                    except json.JSONDecodeError:
                        continue
                        
        return correlations
        
    def _write_log(self, entry: Dict[str, Any]) -> None:
        """Write entry to main log file."""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            json.dump(entry, f)
            f.write('\n')
            
    def _write_correlation_log(self, entry: Dict[str, Any]) -> None:
        """Write entry to correlation log file."""
        with open(self.correlation_log, 'a', encoding='utf-8') as f:
            json.dump(entry, f)
            f.write('\n')
