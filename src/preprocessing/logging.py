import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

class ExtractionLogger:
    def __init__(self, log_file: str, correlation_log: str):
        """Initialize logger with separate files for extraction and correlation logs."""
        self.log_file = log_file
        self.correlation_log = correlation_log
        
        # Ensure log directories exist
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        os.makedirs(os.path.dirname(correlation_log), exist_ok=True)
        
        # Setup file logger
        self.logger = logging.getLogger('extraction')
        self.logger.setLevel(logging.DEBUG)
        
        # File handler for general logs
        fh = logging.FileHandler(log_file)
        fh.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        self.logger.addHandler(fh)
        
        # Console handler for immediate feedback
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        ch.setFormatter(formatter)
        self.logger.addHandler(ch)

    def log_extraction(self, file_path: str, metadata: Dict[str, Any], success: bool = True):
        """Log extraction details for a file."""
        entry = {
            'timestamp': datetime.now().isoformat(),
            'file': file_path,
            'success': success,
            'metadata': metadata
        }
        
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                json.dump(entry, f)
                f.write('\n')
                
            level = logging.INFO if success else logging.ERROR
            self.logger.log(
                level,
                f"{'Successfully processed' if success else 'Failed to process'}: {file_path}"
            )
        except Exception as e:
            self.logger.error(f"Error writing to log file: {str(e)}")

    def log_correlation(self, correlation: Dict[str, Any]):
        """Log correlation between files."""
        entry = {
            'timestamp': datetime.now().isoformat(),
            'matches': [
                {
                    'file1': correlation['file1'],
                    'file2': correlation['file2'],
                    'confidence': correlation['confidence']
                }
            ]
        }
        
        try:
            with open(self.correlation_log, 'a', encoding='utf-8') as f:
                json.dump(entry, f)
                f.write('\n')
                
            self.logger.info(
                f"Correlation found between {correlation['file1']} and "
                f"{correlation['file2']} (confidence: {correlation['confidence']:.2f})"
            )
        except Exception as e:
            self.logger.error(f"Error writing to correlation log: {str(e)}")

    def error(self, message: str, file_path: Optional[str] = None):
        """Log an error message."""
        if file_path:
            message = f"{file_path}: {message}"
        self.logger.error(message)

    def info(self, message: str):
        """Log an info message."""
        self.logger.info(message)

    def debug(self, message: str):
        """Log a debug message."""
        self.logger.debug(message)

    def get_recent_correlations(self, limit: int = 10) -> list:
        """Get most recent correlations from the log."""
        correlations = []
        try:
            if os.path.exists(self.correlation_log):
                with open(self.correlation_log, 'r', encoding='utf-8') as f:
                    for line in f:
                        try:
                            entry = json.loads(line)
                            correlations.extend(entry.get('matches', []))
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            self.logger.error(f"Error reading correlation log: {str(e)}")
            
        # Sort by timestamp (newest first) and limit
        correlations.sort(
            key=lambda x: x.get('timestamp', ''),
            reverse=True
        )
        return correlations[:limit]

    def get_processing_stats(self) -> Dict[str, Any]:
        """Get statistics about processed files."""
        stats = {
            'total_processed': 0,
            'successful': 0,
            'failed': 0,
            'by_type': {}
        }
        
        try:
            if os.path.exists(self.log_file):
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        try:
                            entry = json.loads(line)
                            stats['total_processed'] += 1
                            
                            if entry.get('success', False):
                                stats['successful'] += 1
                            else:
                                stats['failed'] += 1
                                
                            # Count by file type
                            file_type = os.path.splitext(entry['file'])[1][1:]
                            if file_type:
                                stats['by_type'][file_type] = (
                                    stats['by_type'].get(file_type, 0) + 1
                                )
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            self.logger.error(f"Error calculating processing stats: {str(e)}")
            
        return stats
