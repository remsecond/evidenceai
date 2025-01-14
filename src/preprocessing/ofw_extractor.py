import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

class OFWExtractor:
    def __init__(self, logger=None):
        self.logger = logger
        self.correlations = []

    def extract_text(self, file_path: str) -> str:
        """Extract text from OFW message report."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error reading OFW file {file_path}: {str(e)}")
            raise

    def extract_metadata(self, file_path: str) -> Dict:
        """Extract metadata from OFW message report."""
        metadata = {
            'message_count': 0,
            'date_range': {
                'start': None,
                'end': None
            },
            'participants': set(),
            'thread_count': 0
        }

        try:
            text = self.extract_text(file_path)
            
            # Extract dates
            dates = re.findall(r'\d{4}-\d{2}-\d{2}', text)
            if dates:
                metadata['date_range']['start'] = min(dates)
                metadata['date_range']['end'] = max(dates)

            # Count messages
            messages = re.findall(r'Message ID:', text)
            metadata['message_count'] = len(messages)

            # Extract participants
            participants = re.findall(r'From: ([^\n]+)', text)
            metadata['participants'] = list(set(participants))

            # Count threads
            threads = re.findall(r'Thread ID:', text)
            metadata['thread_count'] = len(threads)

            return metadata
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error extracting metadata from {file_path}: {str(e)}")
            return metadata

    def extract_messages(self, text: str) -> List[Dict]:
        """Extract individual messages from OFW report text."""
        messages = []
        
        # Split on Message ID pattern
        parts = re.split(r'(?=Message ID:)', text)
        
        for part in parts:
            if not part.strip():
                continue
                
            message = {}
            
            # Extract message ID
            id_match = re.search(r'Message ID:\s*(\S+)', part)
            if id_match:
                message['id'] = id_match.group(1)
            
            # Extract thread ID
            thread_match = re.search(r'Thread ID:\s*(\S+)', part)
            if thread_match:
                message['thread_id'] = thread_match.group(1)
            
            # Extract sender
            from_match = re.search(r'From:\s*([^\n]+)', part)
            if from_match:
                message['from'] = from_match.group(1).strip()
            
            # Extract timestamp
            date_match = re.search(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})', part)
            if date_match:
                message['timestamp'] = date_match.group(1)
            
            # Extract message body
            body_match = re.search(r'Body:\s*\n(.*?)(?=(?:Message ID:|$))', part, re.DOTALL)
            if body_match:
                message['body'] = body_match.group(1).strip()
            
            if message:
                messages.append(message)
        
        return messages

    def find_correlations(self, file_path: str, processed_files: List[str], threshold: float = 0.7) -> List[Dict]:
        """Find correlations between OFW reports based on thread IDs and content."""
        correlations = []
        try:
            current_text = self.extract_text(file_path)
            current_messages = self.extract_messages(current_text)
            current_threads = {msg['thread_id'] for msg in current_messages if 'thread_id' in msg}
            
            for other_file in processed_files:
                if other_file == file_path:
                    continue
                    
                try:
                    other_text = self.extract_text(other_file)
                    other_messages = self.extract_messages(other_text)
                    other_threads = {msg['thread_id'] for msg in other_messages if 'thread_id' in msg}
                    
                    # Check thread overlap
                    thread_overlap = current_threads.intersection(other_threads)
                    if thread_overlap:
                        correlation = {
                            'file1': file_path,
                            'file2': other_file,
                            'confidence': len(thread_overlap) / max(len(current_threads), len(other_threads)),
                            'shared_threads': list(thread_overlap)
                        }
                        correlations.append(correlation)
                        
                        if self.logger:
                            self.logger.info(
                                f"Found correlation: {len(thread_overlap)} shared threads between "
                                f"{os.path.basename(file_path)} and {os.path.basename(other_file)}"
                            )
                except Exception as e:
                    if self.logger:
                        self.logger.error(f"Error processing correlation file {other_file}: {str(e)}")
                    continue
                    
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error finding correlations for {file_path}: {str(e)}")
        
        return correlations

    def get_correlation_stats(self) -> Dict:
        """Get statistics about found correlations."""
        if not self.correlations:
            return {'correlation_clusters': []}
            
        # Group correlations by thread
        thread_clusters = {}
        
        for corr in self.correlations:
            for thread_id in corr.get('shared_threads', []):
                if thread_id not in thread_clusters:
                    thread_clusters[thread_id] = {
                        'files': set(),
                        'confidence': 1.0
                    }
                thread_clusters[thread_id]['files'].update([corr['file1'], corr['file2']])
                thread_clusters[thread_id]['confidence'] = min(
                    thread_clusters[thread_id]['confidence'],
                    corr['confidence']
                )
        
        # Convert to list format
        clusters = [
            {
                'thread_id': thread_id,
                'files': list(cluster['files']),
                'confidence': cluster['confidence'],
                'size': len(cluster['files'])
            }
            for thread_id, cluster in thread_clusters.items()
        ]
        
        return {
            'correlation_clusters': sorted(
                clusters,
                key=lambda x: (-x['size'], -x['confidence'])
            )
        }
