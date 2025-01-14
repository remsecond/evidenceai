export const BaseSchema = {
    raw_content: {
        text: '',
        chunks: [],
        structure: {}
    },
    file_info: {
        path: '',
        size_bytes: 0,
        size_mb: 0,
        created: null,
        modified: null
    },
    statistics: {
        pages: 0,
        words: 0,
        paragraphs: 0,
        average_paragraph_length: 0,
        estimated_total_tokens: 0
    },
    processing_meta: {
        timestamp: '',
        version: '1.0'
    }
};

export function validateBaseSchema(data) {
    // Check if all required top-level properties exist
    const requiredProps = ['raw_content', 'file_info', 'statistics', 'processing_meta'];
    for (const prop of requiredProps) {
        if (!(prop in data)) {
            throw new Error(`Missing required property: ${prop}`);
        }
    }

    // Check raw_content structure
    if (typeof data.raw_content.text !== 'string') {
        throw new Error('raw_content.text must be a string');
    }
    if (!Array.isArray(data.raw_content.chunks)) {
        throw new Error('raw_content.chunks must be an array');
    }

    // Check file_info structure
    if (typeof data.file_info.path !== 'string') {
        throw new Error('file_info.path must be a string');
    }
    if (typeof data.file_info.size_bytes !== 'number') {
        throw new Error('file_info.size_bytes must be a number');
    }

    // Check statistics structure
    if (typeof data.statistics.pages !== 'number') {
        throw new Error('statistics.pages must be a number');
    }
    if (typeof data.statistics.words !== 'number') {
        throw new Error('statistics.words must be a number');
    }

    // Check processing_meta structure
    if (typeof data.processing_meta.timestamp !== 'string') {
        throw new Error('processing_meta.timestamp must be a string');
    }
    if (typeof data.processing_meta.version !== 'string') {
        throw new Error('processing_meta.version must be a string');
    }

    return true;
}

export default BaseSchema;
