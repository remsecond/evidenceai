import { getLogger } from '../../utils/logging.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const logger = getLogger('AttachmentStore');

/**
 * Service for managing deduplicated attachment storage
 */
class AttachmentStore {
    constructor() {
        this.baseDir = process.env.ATTACHMENT_DIR || 'processed/attachments';
        this.metadataFile = path.join(this.baseDir, 'metadata.json');
    }

    /**
     * Initialize the attachment store
     */
    async init() {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            try {
                await fs.access(this.metadataFile);
            } catch {
                await fs.writeFile(this.metadataFile, JSON.stringify({
                    attachments: {},
                    references: {}
                }));
            }
        } catch (error) {
            logger.error('Error initializing attachment store', error);
            throw new Error(`Error storing attachment: ${error.message}`);
        }
    }

    /**
     * Store an attachment with deduplication
     * @param {string} sourcePath - Original file path
     * @param {string} documentId - Parent document ID
     * @returns {Promise<{path: string, hash: string}>} Storage info
     */
    async storeAttachment(sourcePath, documentId) {
        try {
            // Generate content hash
            const hash = await this.hashFile(sourcePath);
            const metadata = await this.loadMetadata();

            // Check if we already have this file
            if (metadata.attachments[hash]) {
                logger.info(`Attachment ${sourcePath} already exists with hash ${hash}`);
                // Add new reference
                if (!metadata.references[hash]) {
                    metadata.references[hash] = [];
                }
                if (!metadata.references[hash].includes(documentId)) {
                    metadata.references[hash].push(documentId);
                    await this.saveMetadata(metadata);
                }
                return {
                    path: metadata.attachments[hash].path,
                    hash
                };
            }

            // Store new file
            const ext = path.extname(sourcePath);
            const storagePath = path.join(this.baseDir, `${hash}${ext}`);
            await fs.copyFile(sourcePath, storagePath);

            // Update metadata
            metadata.attachments[hash] = {
                path: storagePath,
                originalName: path.basename(sourcePath),
                created: new Date().toISOString(),
                references: 1
            };
            metadata.references[hash] = [documentId];
            await this.saveMetadata(metadata);

            return {
                path: storagePath,
                hash
            };
        } catch (error) {
            logger.error('Error storing attachment', error);
            throw new Error(`Error storing attachment: ${error.message}`);
        }
    }

    /**
     * Get attachment info
     * @param {string} hash - Attachment hash
     * @returns {Promise<Object>} Attachment info
     */
    async getAttachmentInfo(hash) {
        try {
            const metadata = await this.loadMetadata();
            return metadata.attachments[hash];
        } catch (error) {
            logger.error('Error getting attachment info', error);
            throw new Error(`Error getting attachment info: ${error.message}`);
        }
    }

    /**
     * Get documents referencing an attachment
     * @param {string} hash - Attachment hash
     * @returns {Promise<Array<string>>} Document IDs
     */
    async getReferences(hash) {
        try {
            const metadata = await this.loadMetadata();
            return metadata.references[hash] || [];
        } catch (error) {
            logger.error('Error getting attachment references', error);
            throw new Error(`Error getting attachment references: ${error.message}`);
        }
    }

    /**
     * Remove a document's reference to an attachment
     * @param {string} hash - Attachment hash
     * @param {string} documentId - Document ID
     * @returns {Promise<void>}
     */
    async removeReference(hash, documentId) {
        try {
            const metadata = await this.loadMetadata();
            if (metadata.references[hash]) {
                metadata.references[hash] = metadata.references[hash].filter(
                    id => id !== documentId
                );
                
                // If no more references, delete the file
                if (metadata.references[hash].length === 0) {
                    const attachmentPath = metadata.attachments[hash].path;
                    await fs.unlink(attachmentPath);
                    delete metadata.attachments[hash];
                    delete metadata.references[hash];
                }

                await this.saveMetadata(metadata);
            }
        } catch (error) {
            logger.error('Error removing attachment reference', error);
            throw new Error(`Error removing attachment reference: ${error.message}`);
        }
    }

    /**
     * Calculate file hash
     * @param {string} filePath - Path to file
     * @returns {Promise<string>} File hash
     */
    async hashFile(filePath) {
        try {
            const content = await fs.readFile(filePath);
            return crypto
                .createHash('sha256')
                .update(content)
                .digest('hex');
        } catch (error) {
            logger.error('Error hashing file', error);
            throw new Error(`Error hashing file: ${error.message}`);
        }
    }

    /**
     * Load attachment metadata
     * @returns {Promise<Object>} Metadata
     */
    async loadMetadata() {
        try {
            const content = await fs.readFile(this.metadataFile, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            logger.error('Error loading metadata', error);
            throw new Error(`Error loading metadata: ${error.message}`);
        }
    }

    /**
     * Save attachment metadata
     * @param {Object} metadata - Metadata to save
     * @returns {Promise<void>}
     */
    async saveMetadata(metadata) {
        try {
            await fs.writeFile(
                this.metadataFile,
                JSON.stringify(metadata, null, 2)
            );
        } catch (error) {
            logger.error('Error saving metadata', error);
            throw new Error(`Error saving metadata: ${error.message}`);
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage stats
     */
    async getStats() {
        try {
            const metadata = await this.loadMetadata();
            const attachmentCount = Object.keys(metadata.attachments).length;
            const referenceCount = Object.values(metadata.references)
                .reduce((sum, refs) => sum + refs.length, 0);
            
            let totalSize = 0;
            for (const hash in metadata.attachments) {
                const stats = await fs.stat(metadata.attachments[hash].path);
                totalSize += stats.size;
            }

            return {
                uniqueFiles: attachmentCount,
                totalReferences: referenceCount,
                totalSize,
                deduplicationRatio: referenceCount / Math.max(attachmentCount, 1)
            };
        } catch (error) {
            logger.error('Error getting storage stats', error);
            throw new Error(`Error getting storage stats: ${error.message}`);
        }
    }
}

export default new AttachmentStore();
