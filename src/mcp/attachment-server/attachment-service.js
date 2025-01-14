import attachmentStore from '../../../simple-pdf-processor/src/services/attachment-store.js';

class AttachmentService {
    constructor() {
        this.store = attachmentStore;
    }

    async init() {
        await this.store.init();
    }

    async getAttachmentInfo(hash) {
        const info = await this.store.getAttachmentInfo(hash);
        if (!info) {
            return {
                success: false,
                error: `Attachment not found: ${hash}`
            };
        }

        const refs = await this.store.getReferences(hash);
        return {
            success: true,
            data: {
                ...info,
                references: refs
            }
        };
    }

    async getStorageStats() {
        const stats = await this.store.getStats();
        return {
            success: true,
            data: stats
        };
    }

    async findDuplicates(minReferences = 2) {
        const metadata = await this.store.loadMetadata();
        
        const duplicates = Object.entries(metadata.references)
            .filter(([_, refs]) => refs.length >= minReferences)
            .map(([hash, refs]) => ({
                hash,
                info: metadata.attachments[hash],
                references: refs
            }));

        return {
            success: true,
            data: duplicates
        };
    }
}

export default new AttachmentService();
