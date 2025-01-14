import json
from typing import Dict, List, Any
from datetime import datetime
import hashlib
from difflib import SequenceMatcher
from .sheets_updater import SheetsUpdater

class ContentCorrelator:
    """Handles content correlation with iterative improvement."""
    
    def __init__(self, log_file: str):
        self.log_file = log_file
        self.content_store = {}  # Store processed content
        self.correlation_clusters = []  # Groups of related content
        self.confidence_threshold = 0.7  # Default confidence threshold
        self.iteration_count = 0  # Track number of processing iterations
        self.sheets_updater = SheetsUpdater()  # Initialize sheets updater
        
    def _compute_hash(self, text: str) -> str:
        """Compute normalized hash of text."""
        normalized = ' '.join(text.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def _compute_similarity(self, text1: str, text2: str) -> float:
        """Compute similarity ratio between two texts."""
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract potential key phrases for matching."""
        # Split into sentences or paragraphs
        chunks = [chunk.strip() for chunk in text.split('.') if chunk.strip()]
        return chunks
    
    def log_content(self, source_type: str, source_path: str, content: Dict[str, Any]) -> None:
        """Log content for correlation tracking."""
        if 'text' not in content:
            return
            
        text = content['text']
        content_hash = self._compute_hash(text)
        key_phrases = self._extract_key_phrases(text)
        
        entry = {
            'source_type': source_type,
            'source_path': source_path,
            'content_hash': content_hash,
            'key_phrases': key_phrases,
            'timestamp': datetime.utcnow().isoformat(),
            'iteration': self.iteration_count
        }
        
        self.content_store[content_hash] = entry
        
        # Log to file
        with open(self.log_file, 'a', encoding='utf-8') as f:
            json.dump(entry, f)
            f.write('\n')
            
    def find_correlations(self, text: str, threshold: float = None) -> List[Dict[str, Any]]:
        """Find correlations for given text, improving with each iteration."""
        if threshold is None:
            threshold = self.confidence_threshold
            
        correlations = []
        text_hash = self._compute_hash(text)
        text_phrases = self._extract_key_phrases(text)
        
        # First pass: Look for exact matches
        if text_hash in self.content_store:
            source = self.content_store[text_hash]
            correlations.append({
                'match_type': 'exact',
                'confidence': 1.0,
                'source': source,
                'iteration': self.iteration_count
            })
            
        # Second pass: Look for similar content
        for stored_hash, stored_content in self.content_store.items():
            if stored_hash == text_hash:
                continue
                
            # Compare key phrases
            phrase_matches = 0
            total_phrases = len(text_phrases)
            
            for phrase in text_phrases:
                for stored_phrase in stored_content['key_phrases']:
                    similarity = self._compute_similarity(phrase, stored_phrase)
                    if similarity > threshold:
                        phrase_matches += 1
                        break
            
            if phrase_matches > 0:
                confidence = phrase_matches / total_phrases
                if confidence > threshold:
                    correlations.append({
                        'match_type': 'similar',
                        'confidence': confidence,
                        'source': stored_content,
                        'iteration': self.iteration_count,
                        'matched_phrases': phrase_matches
                    })
        
        # Update correlation clusters
        if correlations:
            cluster = {
                'content_hash': text_hash,
                'correlations': correlations,
                'iteration': self.iteration_count,
                'timestamp': datetime.utcnow().isoformat()
            }
            self.correlation_clusters.append(cluster)
            
            # Update Google Sheets
            self.sheets_updater.update_correlations(correlations, self.iteration_count)
            self.sheets_updater.update_clusters(self.correlation_clusters)
        
        # Increment iteration count for next round
        self.iteration_count += 1
        
        return correlations
    
    def get_correlation_stats(self) -> Dict[str, Any]:
        """Get statistics about correlations."""
        stats = {
            'total_documents': len(self.content_store),
            'total_unique_content': len(set(self.content_store.keys())),
            'correlation_clusters': self.correlation_clusters,
            'source_type_breakdown': {},
            'iterations_completed': self.iteration_count
        }
        
        # Count documents by source type
        for content in self.content_store.values():
            source_type = content['source_type']
            stats['source_type_breakdown'][source_type] = stats['source_type_breakdown'].get(source_type, 0) + 1
            
        # Update Google Sheets with stats
        self.sheets_updater.update_stats(stats)
            
        return stats
    
    def set_confidence_threshold(self, threshold: float) -> None:
        """Adjust confidence threshold for matches."""
        if 0.0 <= threshold <= 1.0:
            self.confidence_threshold = threshold
