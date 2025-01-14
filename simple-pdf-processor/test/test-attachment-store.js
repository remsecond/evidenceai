import { expect } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import attachmentStore from '../src/services/attachment-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AttachmentStore', () => {
    const fixturesPath = path.join(__dirname, 'fixtures');
    const testAttachment = path.join(fixturesPath, 'sample-attachment.txt');
    const testAttachment2 = path.join(fixturesPath, 'sample-attachment-2.txt');

    // Clean up test storage before each test
    beforeEach(async () => {
        try {
            await fs.rm(attachmentStore.baseDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore if directory doesn't exist
        }
        await attachmentStore.init();
    });

    describe('storeAttachment()', () => {
        it('should store new attachment and return storage info', async () => {
            const result = await attachmentStore.storeAttachment(testAttachment, 'doc1');

            expect(result).to.have.property('path');
            expect(result).to.have.property('hash');
            expect(result.path).to.include(result.hash);

            // Verify file exists
            const exists = await fs.access(result.path)
                .then(() => true)
                .catch(() => false);
            expect(exists).to.be.true;
        });

        it('should deduplicate identical attachments', async () => {
            // Store same file twice with different document IDs
            const result1 = await attachmentStore.storeAttachment(testAttachment, 'doc1');
            const result2 = await attachmentStore.storeAttachment(testAttachment, 'doc2');

            // Should return same storage path and hash
            expect(result1.path).to.equal(result2.path);
            expect(result1.hash).to.equal(result2.hash);

            // Check references
            const refs = await attachmentStore.getReferences(result1.hash);
            expect(refs).to.have.members(['doc1', 'doc2']);

            // Verify only one file exists
            const stats = await attachmentStore.getStats();
            expect(stats.uniqueFiles).to.equal(1);
            expect(stats.totalReferences).to.equal(2);
        });

        it('should handle different attachments separately', async () => {
            const result1 = await attachmentStore.storeAttachment(testAttachment, 'doc1');
            const result2 = await attachmentStore.storeAttachment(testAttachment2, 'doc2');

            // Should have different paths and hashes
            expect(result1.path).to.not.equal(result2.path);
            expect(result1.hash).to.not.equal(result2.hash);

            // Check references
            const refs1 = await attachmentStore.getReferences(result1.hash);
            const refs2 = await attachmentStore.getReferences(result2.hash);
            expect(refs1).to.have.members(['doc1']);
            expect(refs2).to.have.members(['doc2']);

            // Verify two files exist
            const stats = await attachmentStore.getStats();
            expect(stats.uniqueFiles).to.equal(2);
            expect(stats.totalReferences).to.equal(2);
        });
    });

    describe('reference management', () => {
        it('should track references correctly', async () => {
            // Store same file with multiple references
            const { hash } = await attachmentStore.storeAttachment(testAttachment, 'doc1');
            await attachmentStore.storeAttachment(testAttachment, 'doc2');
            await attachmentStore.storeAttachment(testAttachment, 'doc3');

            const refs = await attachmentStore.getReferences(hash);
            expect(refs).to.have.members(['doc1', 'doc2', 'doc3']);
        });

        it('should remove references and cleanup unused files', async () => {
            // Store file with two references
            const { hash } = await attachmentStore.storeAttachment(testAttachment, 'doc1');
            await attachmentStore.storeAttachment(testAttachment, 'doc2');

            // Remove one reference
            await attachmentStore.removeReference(hash, 'doc1');
            let refs = await attachmentStore.getReferences(hash);
            expect(refs).to.have.members(['doc2']);

            // Remove last reference
            await attachmentStore.removeReference(hash, 'doc2');
            refs = await attachmentStore.getReferences(hash);
            expect(refs).to.be.empty;

            // File should be deleted
            const info = await attachmentStore.getAttachmentInfo(hash);
            expect(info).to.be.undefined;

            // Stats should show no files
            const stats = await attachmentStore.getStats();
            expect(stats.uniqueFiles).to.equal(0);
            expect(stats.totalReferences).to.equal(0);
        });
    });

    describe('storage statistics', () => {
        it('should calculate deduplication ratio', async () => {
            // Store same file multiple times
            await attachmentStore.storeAttachment(testAttachment, 'doc1');
            await attachmentStore.storeAttachment(testAttachment, 'doc2');
            await attachmentStore.storeAttachment(testAttachment, 'doc3');

            // Store different file
            await attachmentStore.storeAttachment(testAttachment2, 'doc4');

            const stats = await attachmentStore.getStats();
            expect(stats.uniqueFiles).to.equal(2); // Two unique files
            expect(stats.totalReferences).to.equal(4); // Four total references
            expect(stats.deduplicationRatio).to.equal(2); // 4 refs / 2 files = 2
        });

        it('should track total storage size', async () => {
            const { hash } = await attachmentStore.storeAttachment(testAttachment, 'doc1');
            await attachmentStore.storeAttachment(testAttachment, 'doc2');

            const stats = await attachmentStore.getStats();
            const fileStats = await fs.stat(testAttachment);
            expect(stats.totalSize).to.equal(fileStats.size);
        });
    });

    describe('error handling', () => {
        it('should handle missing files gracefully', async () => {
            const nonexistentPath = path.join(fixturesPath, 'nonexistent.txt');
            try {
                await attachmentStore.storeAttachment(nonexistentPath, 'doc1');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('Error');
            }
        });

        it('should handle invalid references gracefully', async () => {
            await attachmentStore.removeReference('invalid-hash', 'doc1');
            const refs = await attachmentStore.getReferences('invalid-hash');
            expect(refs).to.be.empty;
        });
    });
});
