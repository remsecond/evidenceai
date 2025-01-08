/**
 * Analyze document to determine type and structure
 */
export async function analyzeDocument(content, filename = '') {
    const startTime = Date.now();
    try {
        console.log('[INFO] Starting document analysis:', filename);

        // Basic format detection
        const format = {
            type: 'unknown',
            subtype: null,
            encoding: 'utf-8',
            structure: 'text'
        };

        // Check for email format
        if (content.match(/^(?:From|To|Subject|Date):/m)) {
            format.type = 'email';
            
            // Check for OFW format
            if (content.includes('Our Family Wizard') || 
                content.includes('OFW') || 
                content.includes('Custody Management Platform')) {
                format.subtype = 'ofw';
            }
        }
        // Check for document format based on content patterns
        else if (content.match(/^(?:Title|Author|Date|Version):/m)) {
            format.type = 'document';
            
            // Check for specific document types
            if (content.includes('LEGAL DOCUMENT') || 
                content.includes('IN THE COURT OF')) {
                format.subtype = 'legal';
            }
        }

        // Analyze structure
        const structureAnalysis = {
            sections: 0,
            lists: 0,
            tables: 0,
            metadata: {}
        };

        // Count sections (separated by blank lines)
        structureAnalysis.sections = (content.match(/\n\s*\n/g) || []).length + 1;

        // Count lists (bullet points or numbered items)
        structureAnalysis.lists = (content.match(/(?:^|\n)[\s-]*[•\-\d]+\./gm) || []).length;

        // Count potential table rows (3 or more | characters)
        structureAnalysis.tables = (content.match(/(?:^|\n)[^|]*\|[^|]*\|[^|]*\|[^|\n]*$/gm) || []).length;

        // Calculate confidence scores
        const confidenceScores = {
            format_detection: calculateFormatConfidence(format, content),
            structure_analysis: calculateStructureConfidence(structureAnalysis),
            content_quality: calculateContentQuality(content)
        };

        const result = {
            format,
            structure: structureAnalysis,
            metadata: {
                filename,
                size: content.length,
                processing_time: Date.now() - startTime,
                confidence_scores: confidenceScores
            }
        };

        console.log('[DEBUG] Document analysis result:', JSON.stringify(result, null, 2));

        console.log('[INFO] Document analysis complete:', {
            type: format.type,
            subtype: format.subtype,
            sections: structureAnalysis.sections,
            processingTime: Date.now() - startTime
        });

        return result;
    } catch (error) {
        console.error('[ERROR] Error analyzing document:', error);
        throw error;
    }
}

/**
 * Calculate format detection confidence
 */
function calculateFormatConfidence(format, content) {
    let confidence = 0.5; // Base confidence

    // Email format confidence
    if (format.type === 'email') {
        const emailHeaders = ['From:', 'To:', 'Subject:', 'Date:']
            .filter(header => content.includes(header)).length;
        confidence = emailHeaders / 4; // Proportion of expected headers found

        // Boost confidence for OFW subtype
        if (format.subtype === 'ofw') {
            confidence = Math.min(1, confidence + 0.2);
        }
    }
    // Document format confidence
    else if (format.type === 'document') {
        const docHeaders = ['Title:', 'Author:', 'Date:', 'Version:']
            .filter(header => content.includes(header)).length;
        confidence = docHeaders / 4;

        // Boost confidence for legal subtype
        if (format.subtype === 'legal') {
            confidence = Math.min(1, confidence + 0.2);
        }
    }

    return confidence;
}

/**
 * Calculate structure analysis confidence
 */
function calculateStructureConfidence(structure) {
    // More structured content generally means higher confidence
    const hasStructure = structure.sections > 1 || 
                        structure.lists > 0 || 
                        structure.tables > 0;
                        
    return hasStructure ? 0.8 : 0.6;
}

/**
 * Calculate content quality score
 */
function calculateContentQuality(content) {
    let score = 0.5; // Base score

    // Check for well-formed paragraphs
    if (content.match(/\n\s*\n/)) {
        score += 0.1;
    }

    // Check for consistent line endings
    if (!content.match(/\r\n/)) {
        score += 0.1;
    }

    // Check for reasonable line lengths
    const lines = content.split('\n');
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    if (avgLineLength > 20 && avgLineLength < 100) {
        score += 0.1;
    }

    // Check for mixed case (not all caps or all lowercase)
    if (content.match(/[A-Z]/) && content.match(/[a-z]/)) {
        score += 0.1;
    }

    // Check for punctuation
    if (content.match(/[.,!?]/)) {
        score += 0.1;
    }

    return Math.min(1, score);
}

export default {
    analyzeDocument
};
