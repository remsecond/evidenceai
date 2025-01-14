import { BaseSchema } from './base-schema.js';

export const TimelineSchema = {
    ...BaseSchema,
    temporal_info: {
        event_date: null,  // Primary event date
        related_dates: [], // Additional dates mentioned
        date_confidence: 0, // Confidence in date extraction (0-1)
        temporal_markers: [] // Extracted temporal phrases
    },
    relationships: {
        attachments: [{
            id: '',
            type: '', // 'email_attachment', 'supporting_doc', etc.
            path: '', // Path in centralized attachment storage
            original_path: '', // Original location
            temporal_relationship: '', // 'before', 'after', 'concurrent'
            confidence: 0 // Match confidence (0-1)
        }],
        related_documents: [{
            id: '',
            type: '', // 'email', 'record', etc.
            relationship: '', // 'parent', 'child', 'reference'
            temporal_relationship: '', // 'before', 'after', 'concurrent'
            confidence: 0 // Match confidence (0-1)
        }]
    },
    event_info: {
        type: '', // 'communication', 'action', 'decision', etc.
        actors: [], // People/organizations involved
        actions: [], // Key activities
        impacts: [], // Effects/consequences
        significance: 0 // Event importance (0-1)
    },
    storage_info: {
        attachment_dir: '', // Path to centralized attachment storage
        google_sheet_id: '', // Associated timeline sheet
        sheet_range: '' // Cell range in timeline sheet
    }
};

export function validateTimelineSchema(data) {
    // First validate base schema
    if (!validateBaseSchema(data)) {
        return false;
    }

    // Validate temporal info
    if (!data.temporal_info || typeof data.temporal_info !== 'object') {
        throw new Error('Missing or invalid temporal_info');
    }

    // Validate relationships
    if (!data.relationships || !Array.isArray(data.relationships.attachments)) {
        throw new Error('Missing or invalid relationships.attachments');
    }
    if (!Array.isArray(data.relationships.related_documents)) {
        throw new Error('Missing or invalid relationships.related_documents');
    }

    // Validate event info
    if (!data.event_info || typeof data.event_info !== 'object') {
        throw new Error('Missing or invalid event_info');
    }
    if (!Array.isArray(data.event_info.actors)) {
        throw new Error('event_info.actors must be an array');
    }
    if (!Array.isArray(data.event_info.actions)) {
        throw new Error('event_info.actions must be an array');
    }

    // Validate storage info
    if (!data.storage_info || typeof data.storage_info !== 'object') {
        throw new Error('Missing or invalid storage_info');
    }
    if (typeof data.storage_info.attachment_dir !== 'string') {
        throw new Error('storage_info.attachment_dir must be a string');
    }

    return true;
}

export default TimelineSchema;
