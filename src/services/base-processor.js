import fs from 'fs';
import path from 'path';

/**
 * Base document processor that implements core processing principles
 * before model-specific formatting
 */
class BaseProcessor {
    constructor() {
        // Core settings from CHUNKING.md
        this.maxInputSize = 150000; // tokens
        this.reservedOutput = 50000; // tokens
        this.overlapSize = 0.10; // 10% overlap
        this.contextWindow = 1000; // tokens
    }

    /**
     * Pre-process content according to pipeline principles
     */
    async preProcess(content) {
        return {
            normalized: this.normalizeContent(content),
            metadata: this.extractMetadata(content),
            structure: this.preserveStructure(content)
        };
    }

    /**
     * Normalize content format
     * - Clean special characters
     * - Standardize line endings
     * - Remove duplicate whitespace
     */
    normalizeContent(content) {
        return content
            .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Remove control chars
            .replace(/\r\n/g, '\n') // Standardize line endings
            .replace(/[ \t]+/g, ' ') // Normalize whitespace
            .replace(/\n{3,}/g, '\n\n'); // Max double line breaks
    }

    /**
     * Extract and preserve metadata
     */
    extractMetadata(content) {
        const metadata = {
            structure: {
                sections: [],
                headers: [],
                paragraphs: 0
            },
            statistics: {
                characters: content.length,
                estimated_tokens: Math.ceil(content.length / 4),
                lines: content.split('\n').length
            },
            context: {
                document_type: this.detectDocumentType(content),
                language: this.detectLanguage(content),
                formatting: this.detectFormatting(content)
            }
        };

        // Track section boundaries
        const sections = content.split(/(?=\n[A-Z][^a-z\n]{3,}:)/);
        metadata.structure.sections = sections.map(section => {
            const lines = section.split('\n');
            return {
                header: lines[0]?.trim() || '',
                length: section.length,
                estimated_tokens: Math.ceil(section.length / 4)
            };
        });

        return metadata;
    }

    /**
     * Preserve document structure
     */
    preserveStructure(content) {
        const structure = {
            sections: [],
            hierarchy: [],
            references: new Map()
        };

        // Track section hierarchy
        let currentLevel = 0;
        content.split('\n').forEach(line => {
            if (this.isHeader(line)) {
                const level = this.getHeaderLevel(line);
                structure.hierarchy.push({
                    level,
                    text: line.trim(),
                    position: structure.sections.length
                });
                currentLevel = level;
            }
            
            // Track cross-references
            const references = this.extractReferences(line);
            references.forEach(ref => {
                if (!structure.references.has(ref)) {
                    structure.references.set(ref, []);
                }
                structure.references.get(ref).push(structure.sections.length);
            });

            structure.sections.push({
                text: line,
                level: currentLevel,
                has_references: references.length > 0
            });
        });

        return structure;
    }

    /**
     * Detect document type based on content patterns
     */
    detectDocumentType(content) {
        if (content.includes('Subject:') && content.includes('From:')) {
            return 'email';
        }
        if (content.includes('OFW Messages Report')) {
            return 'ofw_report';
        }
        return 'general';
    }

    /**
     * Detect primary language (simplified)
     */
    detectLanguage(content) {
        // Basic detection - extend as needed
        return 'en';
    }

    /**
     * Detect document formatting
     */
    detectFormatting(content) {
        return {
            has_headers: /\n[A-Z][^a-z\n]{3,}:/.test(content),
            has_lists: /\n[\s-]*•/.test(content),
            has_tables: /\|[\s-]+\|/.test(content),
            has_code_blocks: /```[\s\S]+?```/.test(content)
        };
    }

    /**
     * Check if line is a header
     */
    isHeader(line) {
        return (
            /^[A-Z][^a-z\n]{3,}:/.test(line) || // ALL CAPS:
            /^#{1,6}\s/.test(line) || // Markdown
            /^[A-Z][\w\s]{3,}$/.test(line) // Title Case
        );
    }

    /**
     * Get header level (0-5)
     */
    getHeaderLevel(line) {
        if (/^#{1,6}\s/.test(line)) {
            return line.match(/^(#{1,6})\s/)[1].length - 1;
        }
        if (/^[A-Z][^a-z\n]{3,}:/.test(line)) {
            return 0;
        }
        if (/^[A-Z][\w\s]{3,}$/.test(line)) {
            return 1;
        }
        return 5;
    }

    /**
     * Extract cross-references from line
     */
    extractReferences(line) {
        const references = [];
        // Match common reference patterns
        const patterns = [
            /\b(?:see|ref|reference):\s+([^,.]+)/gi,
            /\(([^)]+)\)/g,
            /\[[^\]]+\]/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
                references.push(match[1] || match[0]);
            }
        });
        
        return references;
    }
}

export default BaseProcessor;
