import { analyzeDocument } from './document-analyzer.js';
import { processEmail } from './email-processing.js';
import { processOFW } from './ofw-processing.js';

/**
 * Route document to appropriate processor based on analysis
 */
export async function routeDocument(content, filename = '') {
    try {
        console.log('[INFO] Starting document routing:', filename);

        // Analyze document to determine type
        const analysis = await analyzeDocument(content, filename);
        console.log('[DEBUG] Document analysis:', analysis);

        // Route and process document
        let result;
        if (analysis.format.type === 'email') {
            if (analysis.format.subtype === 'ofw') {
                console.log('[INFO] Routing to OFW processor');
                result = await processOFW(content, analysis);
            } else {
                console.log('[INFO] Routing to email processor');
                result = await processEmail(content, analysis);
            }
        } else {
            console.log('[WARN] Unknown document type:', analysis.format.type);
            result = {
                success: false,
                error: 'Unsupported document type',
                analysis
            };
        }

        // Add routing metadata
        return {
            ...result,
            metadata: {
                ...result.metadata,
                routing: {
                    processor: analysis.format.subtype || analysis.format.type,
                    confidence: analysis.metadata.confidence_scores.format_detection,
                    chunking: result.metadata?.chunking || { enabled: false },
                    processing_stats: {
                        ...result.metadata?.processing_stats,
                        routing_time: Date.now() - analysis.metadata.processing_time
                    }
                }
            }
        };

    } catch (error) {
        console.error('[ERROR] Error routing document:', error);
        throw error;
    }
}

export default {
    routeDocument
};
