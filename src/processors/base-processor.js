import { Transform } from 'stream';
import { validateBaseSchema } from '../schemas/base-schema.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

/**
 * Base processor implementing streaming pipeline architecture.
 * Each processor stage is implemented as a Transform stream.
 */
export class BaseProcessor {
    constructor(options = {}) {
        if (new.target === BaseProcessor) {
            throw new Error('BaseProcessor is abstract and cannot be instantiated directly');
        }

        this.options = {
            chunkSize: 1024 * 64, // 64KB chunks
            maxBufferSize: 1024 * 1024 * 10, // 10MB max buffer
            ...options
        };

        // Initialize processing stages
        this.stages = new Map();
        this.setupStages();
    }

    /**
     * Set up processing pipeline stages.
     * Override in subclasses to add specific stages.
     */
    setupStages() {
        // Content extraction stage
        this.stages.set('extract', new Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                try {
                    // Base extraction just passes through
                    callback(null, chunk);
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // Section identification stage
        this.stages.set('sections', new Transform({
            objectMode: true,
            transform: (chunk, encoding, callback) => {
                try {
                    const sections = this.identifySections(chunk.toString());
                    callback(null, sections);
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // Metadata extraction stage
        this.stages.set('metadata', new Transform({
            objectMode: true,
            transform: (chunk, encoding, callback) => {
                try {
                    const sections = Array.isArray(chunk) ? chunk : [chunk];
                    const text = sections.map(s => s.content).join('\n');
                    
                    const metadata = {
                        participants: this.extractParticipants(text),
                        topics: this.extractTopics(text)
                    };
                    
                    callback(null, { sections, metadata });
                } catch (error) {
                    callback(error);
                }
            }
        }));

        // API response validation stage
        this.stages.set('validate', new Transform({
            objectMode: true,
            transform: (chunk, encoding, callback) => {
                try {
                    if (!chunk || typeof chunk !== 'object') {
                        throw new Error('Invalid API response: response must be an object');
                    }

                    if (!chunk.content && !chunk.text) {
                        throw new Error('Invalid API response: missing content or text field');
                    }

                    if (chunk.error) {
                        throw new Error(`API error: ${chunk.error}`);
                    }

                    // Normalize response format
                    const normalized = {
                        content: chunk.content || chunk.text,
                        type: chunk.type || 'text',
                        metadata: chunk.metadata || {}
                    };

                    callback(null, normalized);
                } catch (error) {
                    logger.error('API response validation failed:', error);
                    callback(error);
                }
            }
        }));
    }

    /**
     * Process a file through the pipeline.
     * @param {string} filePath Path to file to process
     * @returns {Promise<object>} Processing result
     */
    async process(filePath) {
        throw new Error('process must be implemented by subclass');
    }

    /**
     * Validate processing result against schema
     */
    validateResult(result) {
        try {
            validateBaseSchema(result);
            return true;
        } catch (error) {
            logger.error('Schema validation failed:', error.message);
            throw error;
        }
    }

    /**
     * Clean section identification using state machine
     */
    identifySections(text) {
        const sections = [];
        const lines = text.split('\n');
        let currentSection = { header: '', content: [] };

        const isHeader = (line, nextLine) => (
            (line.length > 0 && line.length < 100 && nextLine === '') ||
            (line === line.toUpperCase() && line.length > 3) ||
            line.match(/^\d+[\.\)]/) ||
            nextLine.match(/^[=\-_]{3,}$/)
        );

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const nextLine = lines[i + 1]?.trim() || '';

            if (isHeader(line, nextLine)) {
                if (currentSection.content.length) {
                    sections.push({
                        header: currentSection.header,
                        content: currentSection.content.join('\n').trim()
                    });
                }
                currentSection = { 
                    header: line,
                    content: []
                };
                if (nextLine.match(/^[=\-_]{3,}$/)) i++;
            } else if (line || nextLine) {
                currentSection.content.push(line);
            }
        }

        if (currentSection.content.length) {
            sections.push({
                header: currentSection.header,
                content: currentSection.content.join('\n').trim()
            });
        }

        return sections;
    }

    /**
     * Extract participant names using regex patterns
     */
    extractParticipants(text) {
        const participants = new Set();
        const namePattern = /(?<!First |Last |Next |Previous |Is |Thanks |View |Happy |This |Next |Last |See |Did |Leave |Drop |Also |Has |Our |My |On |At |In |From |To |For |With |The |That |When |Where |What |Why |How |If |Then |And |But |Or |Date |Subject |Re: |Fw: |Fwd: )(?:[A-Z][a-z]{1,20})(?: (?:[A-Z][a-z]{1,20})){1,2}(?! (?:Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Insurance|Payment|Break|Off|Moment|Practices|Plumber|Coordinator|List|Cash|Christmas|Account|Summary|Treatment|Anniversary|Tickets|Card|Moment|Practices|Response|Payment|Fork|Request|Sent|Received|Subject|Message|Report|Round|Truth))/g;
        
        const matches = text.match(namePattern) || [];
        for (const match of matches) {
            participants.add(match.trim());
        }
        
        return Array.from(participants);
    }

    /**
     * Extract topics using categorized regex patterns
     */
    extractTopics(text) {
        const topics = new Set();
        const patterns = {
            communication: /\b(?:meeting|discussion|conversation|message|email|response|reply|notification|contact)\b/gi,
            planning: /\b(?:schedule|plan|agenda|timeline|deadline|date|appointment|upcoming|future)\b/gi,
            documentation: /\b(?:report|document|file|record|attachment|form|paperwork|statement)\b/gi,
            decision: /\b(?:decision|agreement|approval|consent|resolution|confirm|approve|accept)\b/gi,
            issue: /\b(?:issue|problem|concern|question|dispute|conflict|disagreement|complaint)\b/gi,
            action: /\b(?:action|task|todo|follow-up|review|complete|finish|handle|process)\b/gi,
            financial: /\b(?:payment|expense|cost|budget|fund|money|invoice|bill|fee|charge)\b/gi,
            legal: /\b(?:legal|court|attorney|judge|hearing|case|counsel|proceeding|motion)\b/gi,
            family: /\b(?:child|parent|family|guardian|custody|visitation|support)\b/gi,
            scheduling: /\b(?:schedule|appointment|time|date|availability|meet|session)\b/gi
        };

        for (const [category, pattern] of Object.entries(patterns)) {
            const matches = text.match(pattern) || [];
            for (const match of matches) {
                topics.add(match.toLowerCase());
                topics.add(category);
            }
        }

        return Array.from(topics);
    }

    /**
     * Clean up resources
     */
    destroy() {
        for (const stage of this.stages.values()) {
            stage.destroy();
        }
        this.stages.clear();
    }
}

export default BaseProcessor;
