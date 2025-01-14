from typing import Dict, List, Any
from datetime import datetime
import json
from src.mcp.google_sheets_server.index import GoogleSheetsServer

class SheetsUpdater:
    """Updates Google Sheets with correlation results."""
    
    def __init__(self):
        self.sheets_server = GoogleSheetsServer()
        
    def update_correlations(self, correlations: List[Dict[str, Any]], iteration: int) -> None:
        """Update correlation sheet with new findings."""
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare data for sheets
        rows = []
        for corr in correlations:
            row = {
                'timestamp': timestamp,
                'iteration': iteration,
                'match_type': corr['match_type'],
                'confidence': f"{corr['confidence'] * 100:.1f}%",
                'source_type': corr['source']['source_type'],
                'source_path': corr['source']['source_path'],
                'matched_phrases': corr.get('matched_phrases', 'N/A')
            }
            rows.append(row)
            
        # Update correlation tracking sheet
        self.sheets_server.append_rows('Correlations', rows)
        
    def update_stats(self, stats: Dict[str, Any]) -> None:
        """Update statistics sheet."""
        row = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_documents': stats['total_documents'],
            'unique_content': stats['total_unique_content'],
            'iterations': stats['iterations_completed'],
            'clusters': len(stats['correlation_clusters'])
        }
        
        # Add source type breakdown
        for source_type, count in stats['source_type_breakdown'].items():
            row[f'count_{source_type}'] = count
            
        # Update stats tracking sheet
        self.sheets_server.append_rows('Statistics', [row])
        
    def update_clusters(self, clusters: List[Dict[str, Any]]) -> None:
        """Update correlation clusters sheet."""
        rows = []
        for cluster in clusters:
            if len(cluster['correlations']) > 1:  # Only show interesting clusters
                row = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'iteration': cluster['iteration'],
                    'content_hash': cluster['content_hash'],
                    'correlation_count': len(cluster['correlations']),
                    'highest_confidence': max(c['confidence'] for c in cluster['correlations'])
                }
                rows.append(row)
                
        # Update clusters tracking sheet
        self.sheets_server.append_rows('Clusters', rows)
