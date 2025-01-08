import fs from 'fs';
import path from 'path';
import { getLogger, logError } from '../utils/logging.js';

const logger = getLogger();

// Base directories for file storage
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const PROCESSED_DIR = path.join(process.cwd(), 'processed');

// Ensure directories exist
[UPLOAD_DIR, PROCESSED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

export async function setupStorage() {
    try {
        logger.info('Local storage service initialized');
        return true;
    } catch (error) {
        logError(error, { service: 'storage', operation: 'setup' });
        throw new Error('Failed to initialize storage service');
    }
}

export async function createFolder(folderName) {
    try {
        const folderPath = path.join(PROCESSED_DIR, folderName);
        fs.mkdirSync(folderPath, { recursive: true });
        
        logger.info('Created folder', { folderPath });
        
        return {
            id: folderName,
            name: folderName,
            webViewLink: `file://${folderPath}`
        };
    } catch (error) {
        logError(error, { 
            service: 'storage',
            operation: 'createFolder',
            folderName 
        });
        throw error;
    }
}

export async function uploadFile(fileBuffer, fileName, mimeType, folderId = null) {
    try {
        const targetDir = folderId ? path.join(PROCESSED_DIR, folderId) : UPLOAD_DIR;
        const filePath = path.join(targetDir, fileName);
        
        // Ensure target directory exists
        fs.mkdirSync(targetDir, { recursive: true });
        
        // Write file
        fs.writeFileSync(filePath, fileBuffer);
        
        logger.info('File uploaded', { 
            fileName,
            filePath 
        });
        
        return {
            id: fileName,
            name: fileName,
            webViewLink: `file://${filePath}`,
            mimeType
        };
    } catch (error) {
        logError(error, { 
            service: 'storage',
            operation: 'uploadFile',
            fileName 
        });
        throw error;
    }
}

export async function downloadFile(fileId) {
    try {
        // Search in both directories
        let filePath = path.join(UPLOAD_DIR, fileId);
        if (!fs.existsSync(filePath)) {
            filePath = path.join(PROCESSED_DIR, fileId);
        }
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fileId}`);
        }
        
        const content = fs.readFileSync(filePath);
        logger.info('File downloaded', { fileId });
        
        return content;
    } catch (error) {
        logError(error, { 
            service: 'storage',
            operation: 'downloadFile',
            fileId 
        });
        throw error;
    }
}

export async function listFiles(folderId = null, pageSize = 100) {
    try {
        const targetDir = folderId ? path.join(PROCESSED_DIR, folderId) : UPLOAD_DIR;
        
        if (!fs.existsSync(targetDir)) {
            return [];
        }
        
        const files = fs.readdirSync(targetDir)
            .filter(file => fs.statSync(path.join(targetDir, file)).isFile())
            .map(file => ({
                id: file,
                name: file,
                mimeType: 'application/octet-stream',
                webViewLink: `file://${path.join(targetDir, file)}`,
                createdTime: fs.statSync(path.join(targetDir, file)).birthtime.toISOString()
            }))
            .slice(0, pageSize);
            
        logger.info('Listed files', { 
            targetDir,
            count: files.length 
        });
        
        return files;
    } catch (error) {
        logError(error, { 
            service: 'storage',
            operation: 'listFiles',
            folderId 
        });
        throw error;
    }
}

export async function deleteFile(fileId) {
    try {
        // Search in both directories
        let filePath = path.join(UPLOAD_DIR, fileId);
        if (!fs.existsSync(filePath)) {
            filePath = path.join(PROCESSED_DIR, fileId);
        }
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fileId}`);
        }
        
        fs.unlinkSync(filePath);
        logger.info('File deleted', { fileId });
    } catch (error) {
        logError(error, { 
            service: 'storage',
            operation: 'deleteFile',
            fileId 
        });
        throw error;
    }
}

export async function searchFiles(query, pageSize = 100) {
    try {
        const allFiles = [];
        
        // Search in both directories
        [UPLOAD_DIR, PROCESSED_DIR].forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir)
                    .filter(file => file.toLowerCase().includes(query.toLowerCase()))
                    .map(file => ({
                        id: file,
                        name: file,
                        mimeType: 'application/octet-stream',
                        webViewLink: `file://${path.join(dir, file)}`,
                        createdTime: fs.statSync(path.join(dir, file)).birthtime.toISOString()
                    }));
                allFiles.push(...files);
            }
        });
        
        logger.info('Searched files', { 
            query,
            resultCount: allFiles.length 
        });
        
        return allFiles.slice(0, pageSize);
    } catch (error) {
        logError(error, { 
            service: 'storage',
            operation: 'searchFiles',
            query 
        });
        throw error;
    }
}
