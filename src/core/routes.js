import express from 'express';
import multer from 'multer';
import path from 'path';
import { getLogger } from '../utils/logging.js';
import * as storage from '../services/storage.js';
import * as ai from '../services/ai.js';

const logger = getLogger();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files per request
    }
});

// Helper function to determine file type
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.eml':
            return 'email';
        case '.msg':
            return 'email';
        case '.txt':
            return 'text';
        case '.doc':
        case '.docx':
        case '.pdf':
            return 'document';
        default:
            return 'text';
    }
}

// Health check helpers
async function checkStorageHealth() {
    try {
        await storage.setupStorage();
        return { status: 'healthy' };
    } catch (error) {
        logger.error('Storage health check failed:', error);
        return { status: 'unhealthy', error: error.message };
    }
}

async function checkAIHealth() {
    try {
        await ai.setupAI();
        return { status: 'healthy' };
    } catch (error) {
        logger.error('AI health check failed:', error);
        return { status: 'unhealthy', error: error.message };
    }
}

export function setupRoutes(app) {
    logger.info('Setting up routes');
    
    // Create API router
    const apiRouter = express.Router();

    // Health check endpoint
    apiRouter.get('/health', async (req, res, next) => {
        try {
            logger.info('Health check request received');
            
            // Check services health
            const servicesStatus = {
                storage: await checkStorageHealth(),
                ai: await checkAIHealth()
            };
            
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                services: servicesStatus
            });
        } catch (error) {
            next(error);
        }
    });

    // Upload and analyze files
    apiRouter.post('/analyze', upload.array('files', 10), async (req, res) => {
        try {
            logger.info('Analyze request received');
            
            if (!req.files || req.files.length === 0) {
                logger.warn('No files uploaded');
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const results = [];
            const projectFolder = await storage.createFolder(`Project_${Date.now()}`);

            for (const file of req.files) {
                logger.info(`Processing file: ${file.originalname}`);

                // Upload to storage
                const uploadedFile = await storage.uploadFile(
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                    projectFolder.id
                );

                // Analyze content
                const fileType = getFileType(file.originalname);
                const content = file.buffer.toString();
                const processedContent = ai.preprocessContent(content, fileType);
                const analysis = await ai.analyzeDocument(processedContent, fileType);

                results.push({
                    filename: file.originalname,
                    fileId: uploadedFile.id,
                    fileType,
                    analysis,
                    webViewLink: uploadedFile.webViewLink
                });
            }

            logger.info('Analysis completed successfully');
            res.json({
                projectId: projectFolder.id,
                projectLink: projectFolder.webViewLink,
                results
            });

        } catch (error) {
            logger.error('Analysis failed:', error);
            res.status(500).json({ 
                error: 'Analysis failed', 
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    // Generate timeline from analyzed documents
    apiRouter.post('/timeline', async (req, res) => {
        try {
            const { projectId } = req.body;
            if (!projectId) {
                return res.status(400).json({ error: 'Project ID is required' });
            }

            // Get all files in the project
            const files = await storage.listFiles(projectId);
            const events = [];

            // Process each file
            for (const file of files) {
                const content = await storage.downloadFile(file.id);
                const fileType = getFileType(file.name);
                const processedContent = ai.preprocessContent(content, fileType);
                const analysis = await ai.analyzeDocument(processedContent, fileType);
                
                // Extract events from analysis
                events.push(...JSON.parse(analysis).events);
            }

            // Generate timeline
            const timeline = await ai.createTimeline(events);
            
            // Detect patterns
            const patterns = await ai.detectPatterns(timeline);

            logger.info('Timeline generation completed');
            res.json({
                timeline,
                patterns,
                eventCount: events.length
            });

        } catch (error) {
            logger.error('Timeline generation failed:', error);
            res.status(500).json({ 
                error: 'Timeline generation failed', 
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    // List projects
    apiRouter.get('/projects', async (req, res) => {
        try {
            const folders = await storage.listFiles(null, 50);
            const projects = folders.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
            
            logger.info(`Found ${projects.length} projects`);
            res.json({ projects });
        } catch (error) {
            logger.error('Failed to list projects:', error);
            res.status(500).json({ 
                error: 'Failed to list projects', 
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    // Get project details
    apiRouter.get('/projects/:projectId', async (req, res) => {
        try {
            const { projectId } = req.params;
            const files = await storage.listFiles(projectId);
            
            logger.info(`Retrieved project details for ${projectId}`);
            res.json({ 
                projectId,
                files,
                fileCount: files.length
            });
        } catch (error) {
            logger.error('Failed to get project details:', error);
            res.status(500).json({ 
                error: 'Failed to get project details', 
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    // Delete project
    apiRouter.delete('/projects/:projectId', async (req, res) => {
        try {
            const { projectId } = req.params;
            await storage.deleteFile(projectId);
            
            logger.info(`Project ${projectId} deleted successfully`);
            res.json({ message: 'Project deleted successfully' });
        } catch (error) {
            logger.error('Failed to delete project:', error);
            res.status(500).json({ 
                error: 'Failed to delete project', 
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    // Mount API router
    app.use('/api/v1', apiRouter);
    logger.info('Routes mounted at /api/v1');

    // Add catch-all route for 404s
    app.use((req, res) => {
        logger.warn('404 Not Found', { path: req.path, method: req.method });
        res.status(404).json({ 
            error: 'Not Found',
            path: req.path,
            method: req.method
        });
    });
}
