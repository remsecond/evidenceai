import { Transform } from 'stream';
import { getLogger } from '../../utils/logging.js';
import { TimelineSchema } from './timeline-schema.js';
import { BaseProcessor } from '../base-processor.js';
import documentMatcher from './document-matcher.js';
import contentExtractor from './content-extractor.js';

const logger = getLogger('TimelineProcessor');

/**
 * Service for processing documents into timeline events with temporal relationships
 */
class TimelineProcessor extends BaseProcessor {
    constructor() {
        super();
        this.attachmentBaseDir = process.env.ATTACHMENT_DIR || 'processed/attachments';
    }

    /**
     * Set up processing pipeline stages
     */
    setupStages() {
        super.setupStages();

        // Content extraction stage
        this.stages.set('extract', new Transform({
            objectMode: true,
            async transform(document, encoding, callback) {
                try {
                    const content = await contentExtractor.extractContent(document);
                    if (!content) {
                        throw new Error('Failed to extract content');
                    }
                    callback(null, { document, content });
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // Timeline event creation stage
        this.stages.set('timeline', new Transform({
            objectMode: true,
            transform: async (data, encoding, callback) => {
                try {
                    const { document, content } = data;
                    const timelineData = {
                        ...TimelineSchema,
                        raw_content: {
                            text: content,
                            chunks: [],
                            structure: {}
                        },
                        relationships: {
                            attachments: [],
                            related_documents: []
                        },
                        file_info: {
                            path: document.path,
                            size_bytes: document.size || 0,
                            size_mb: (document.size || 0) / (1024 * 1024),
                            created: document.created,
                            modified: document.modified
                        }
                    };

                    // Extract temporal information
                    const temporalInfo = await this.extractTemporalInfo(content);
                    timelineData.temporal_info = temporalInfo;

                    // Extract event information
                    const eventInfo = await this.extractEventInfo(content);
                    timelineData.event_info = eventInfo;

                    // Set up storage info
                    timelineData.storage_info = {
                        attachment_dir: this.attachmentBaseDir,
                        google_sheet_id: '', // Will be set when synced
                        sheet_range: '' // Will be set when synced
                    };

                    callback(null, timelineData);
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // Attachment handling stage
        this.stages.set('attachments', new Transform({
            objectMode: true,
            transform: async (timelineData, encoding, callback) => {
                try {
                    if (document.classification.type === 'spreadsheet' || 
                        document.classification.type === 'document') {
                        const attachmentInfo = await this.copyAttachment(
                            document.path,
                            document.id
                        );
                        timelineData.relationships.attachments.push({
                            path: attachmentInfo.path,
                            hash: attachmentInfo.hash,
                            type: document.classification.type
                        });
                    }
                    callback(null, timelineData);
                } catch (error) {
                    callback(error);
                }
            }
        }));
    }

    /**
     * Process a document into a timeline event
     * @param {DocumentEntity} document - Document to process
     * @returns {Promise<Object>} Timeline event data
     */
    async processDocument(document) {
        try {
            return new Promise((resolve, reject) => {
                const pipeline = this.stages.get('extract')
                    .pipe(this.stages.get('timeline'))
                    .pipe(this.stages.get('attachments'));

                let result;
                pipeline.on('data', data => result = data);
                pipeline.on('end', () => resolve(result));
                pipeline.on('error', error => reject(error));

                this.stages.get('extract').write(document);
                this.stages.get('extract').end();
            });
        } catch (error) {
            logger.error('Error processing document for timeline', error);
            throw error;
        }
    }

    /**
     * Process a set of related documents into timeline events
     * @param {Array<DocumentEntity>} documents - Documents to process
     * @returns {Promise<Array<Object>>} Timeline events with relationships
     */
    async processDocumentSet(documents) {
        try {
            // First find document relationships
            const relationships = await documentMatcher.findRelationships(documents);
            
            // Process each document
            const timelineEvents = await Promise.all(
                documents.map(doc => this.processDocument(doc))
            );

            // Add relationship information
            for (const relationship of relationships) {
                const sourceEvent = timelineEvents.find(
                    event => event.file_info.path === documents.find(
                        doc => doc.id === relationship.source
                    )?.path
                );
                const targetEvent = timelineEvents.find(
                    event => event.file_info.path === documents.find(
                        doc => doc.id === relationship.target
                    )?.path
                );

                if (sourceEvent && targetEvent) {
                    // Add relationship to source event
                    sourceEvent.relationships.related_documents.push({
                        id: relationship.target,
                        type: relationship.type,
                        relationship: 'source',
                        temporal_relationship: this.determineTemporalRelationship(
                            sourceEvent.temporal_info,
                            targetEvent.temporal_info
                        ),
                        confidence: relationship.confidence
                    });

                    // Add relationship to target event
                    targetEvent.relationships.related_documents.push({
                        id: relationship.source,
                        type: relationship.type,
                        relationship: 'target',
                        temporal_relationship: this.determineTemporalRelationship(
                            targetEvent.temporal_info,
                            sourceEvent.temporal_info
                        ),
                        confidence: relationship.confidence
                    });
                }
            }

            return timelineEvents;
        } catch (error) {
            logger.error('Error processing document set for timeline', error);
            throw error;
        }
    }

    /**
     * Extract temporal information from content
     * @param {string} content - Document content
     * @returns {Promise<Object>} Temporal information
     */
    async extractTemporalInfo(content) {
        try {
            // TODO: Use NLP to extract dates and temporal markers
            // For now, use basic date extraction
            const dateRegex = /\b\d{4}-\d{2}-\d{2}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi;
            const dates = content.match(dateRegex) || [];
            
            return {
                event_date: dates[0] ? new Date(dates[0]) : null,
                related_dates: dates.slice(1).map(d => new Date(d)),
                date_confidence: dates.length > 0 ? 0.8 : 0,
                temporal_markers: [] // TODO: Extract before/after markers
            };
        } catch (error) {
            logger.error('Error extracting temporal info', error);
            return {
                event_date: null,
                related_dates: [],
                date_confidence: 0,
                temporal_markers: []
            };
        }
    }

    /**
     * Extract event information from content
     * @param {string} content - Document content
     * @returns {Promise<Object>} Event information
     */
    async extractEventInfo(content) {
        try {
            // TODO: Use NLP to extract actors and actions
            // For now, use basic extraction
            const emailRegex = /\b[\w\.-]+@[\w\.-]+\.\w+\b/g;
            const actors = content.match(emailRegex) || [];
            
            return {
                type: 'communication', // Default for now
                actors,
                actions: [], // TODO: Extract actions
                impacts: [], // TODO: Extract impacts
                significance: 0.5 // Default medium significance
            };
        } catch (error) {
            logger.error('Error extracting event info', error);
            return {
                type: '',
                actors: [],
                actions: [],
                impacts: [],
                significance: 0
            };
        }
    }

    /**
     * Determine temporal relationship between two events
     * @param {Object} source - Source event temporal info
     * @param {Object} target - Target event temporal info
     * @returns {string} Temporal relationship type
     */
    determineTemporalRelationship(source, target) {
        if (!source.event_date || !target.event_date) {
            return 'unknown';
        }

        const sourceDate = new Date(source.event_date);
        const targetDate = new Date(target.event_date);

        if (sourceDate < targetDate) {
            return 'before';
        } else if (sourceDate > targetDate) {
            return 'after';
        } else {
            return 'concurrent';
        }
    }

    /**
     * Store attachment with deduplication
     * @param {string} sourcePath - Original attachment path
     * @param {string} documentId - Parent document ID
     * @returns {Promise<{path: string, hash: string}>} Storage info
     */
    async copyAttachment(sourcePath, documentId) {
        try {
            const attachmentStore = (await import('./attachment-store.js')).default;
            await attachmentStore.init();
            return await attachmentStore.storeAttachment(sourcePath, documentId);
        } catch (error) {
            logger.error('Error storing attachment', error);
            throw error;
        }
    }

    /**
     * Get timeline data for visualization
     * @returns {Promise<Array>} Array of timeline events
     */
    async getTimelineData() {
        try {
            // For development, return sample data
            return [
                {
                    temporal_info: { event_date: '2024-01-15T10:30:00Z' },
                    file_info: { path: 'email1.txt', size_bytes: 156 },
                    event_info: { type: 'email' },
                    relationships: { attachments: [], related_documents: [] }
                },
                {
                    temporal_info: { event_date: '2024-01-16T14:20:00Z' },
                    file_info: { path: 'proposal.pdf', size_bytes: 1024 },
                    event_info: { type: 'document' },
                    relationships: { attachments: [], related_documents: [] }
                }
            ];
        } catch (error) {
            logger.error('Error getting timeline data', error);
            return [];
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStorageStats() {
        try {
            const attachmentStore = (await import('./attachment-store.js')).default;
            await attachmentStore.init();
            return await attachmentStore.getStats();
        } catch (error) {
            logger.error('Error getting storage stats', error);
            return {
                uniqueFiles: 0,
                totalReferences: 0,
                totalSize: 0,
                deduplicationRatio: 0
            };
        }
    }
}

export default new TimelineProcessor();
