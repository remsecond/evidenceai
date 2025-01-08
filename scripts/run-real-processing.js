#!/usr/bin/env node

import { processRealDataset } from './process-real-data.js';
import { getLogger } from '../src/utils/logging.js';
import { getMetrics, resetMetrics } from '../src/services/monitoring.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

// CLI configuration with defaults
const CONFIG = {
    inputDir: './test-data',
    outputDir: './processed-data',
    chunkSize: process.env.CHUNK_SIZE || 100000,
    batchSize: process.env.BATCH_SIZE || 50,
    maxConcurrent: process.env.MAX_CONCURRENT || 10,
    memoryLimit: process.env.MEMORY_LIMIT || 0.8,
    queueLimit: process.env.QUEUE_LIMIT || 1000
};

/**
 * Process command line arguments
 */
function processArgs() {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i += 2) {
        const arg = args[i];
        const value = args[i + 1];
        
        switch (arg) {
            case '--input':
                CONFIG.inputDir = value;
                break;
            case '--output':
                CONFIG.outputDir = value;
                break;
            case '--chunk-size':
                CONFIG.chunkSize = parseInt(value);
                break;
            case '--batch-size':
                CONFIG.batchSize = parseInt(value);
                break;
            case '--max-concurrent':
                CONFIG.maxConcurrent = parseInt(value);
                break;
            case '--memory-limit':
                CONFIG.memoryLimit = parseFloat(value);
                break;
            case '--queue-limit':
                CONFIG.queueLimit = parseInt(value);
                break;
            case '--help':
                showHelp();
                process.exit(0);
        }
    }
}

/**
 * Show help message
 */
function showHelp() {
    console.log(`
Usage: node run-real-processing.js [options]

Options:
  --input <dir>           Input directory containing OFW documents (default: ./test-data)
  --output <dir>          Output directory for processed results (default: ./processed-data)
  --chunk-size <n>        Maximum chunk size in tokens (default: 100000)
  --batch-size <n>        Number of documents per batch (default: 50)
  --max-concurrent <n>    Maximum concurrent operations (default: 10)
  --memory-limit <n>      Memory usage limit 0-1 (default: 0.8)
  --queue-limit <n>       Maximum queue length (default: 1000)
  --help                  Show this help message

Environment variables:
  CHUNK_SIZE             Alternative to --chunk-size
  BATCH_SIZE            Alternative to --batch-size
  MAX_CONCURRENT        Alternative to --max-concurrent
  MEMORY_LIMIT          Alternative to --memory-limit
  QUEUE_LIMIT           Alternative to --queue-limit
`);
}

/**
 * Load documents from directory
 */
async function loadDocuments(dir) {
    try {
        const files = await fs.readdir(dir);
        const documents = [];
        
        for (const file of files) {
            if (file.endsWith('.txt') || file.endsWith('.eml')) {
                const content = await fs.readFile(path.join(dir, file), 'utf8');
                documents.push({
                    id: path.basename(file, path.extname(file)),
                    filename: file,
                    content
                });
            }
        }
        
        return documents;
    } catch (error) {
        logger.error('Error loading documents', { error });
        throw error;
    }
}

/**
 * Save results to output directory
 */
async function saveResults(results, dir) {
    try {
        // Ensure output directory exists
        await fs.mkdir(dir, { recursive: true });
        
        // Save individual results
        for (const result of results) {
            const outputPath = path.join(dir, `${result.id}_processed.json`);
            await fs.writeFile(
                outputPath,
                JSON.stringify(result, null, 2)
            );
        }
        
        // Save metrics
        const metrics = getMetrics();
        await fs.writeFile(
            path.join(dir, 'processing_metrics.json'),
            JSON.stringify(metrics, null, 2)
        );
        
        logger.info('Results saved', {
            outputDir: dir,
            fileCount: results.length
        });
    } catch (error) {
        logger.error('Error saving results', { error });
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        // Process arguments
        processArgs();
        
        // Reset metrics
        resetMetrics();
        
        // Load documents
        logger.info('Loading documents', { inputDir: CONFIG.inputDir });
        const documents = await loadDocuments(CONFIG.inputDir);
        logger.info('Documents loaded', { count: documents.length });
        
        // Process documents
        logger.info('Starting processing', { config: CONFIG });
        const results = await processRealDataset(documents);
        
        // Save results
        await saveResults(results, CONFIG.outputDir);
        
        // Log final metrics
        const metrics = getMetrics();
        logger.info('Processing complete', {
            documentCount: documents.length,
            successCount: results.length,
            metrics
        });
    } catch (error) {
        logger.error('Processing failed', { error });
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === new URL(import.meta.url).href) {
    main().catch(console.error);
}

export default main;
