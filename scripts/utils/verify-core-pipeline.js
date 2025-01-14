import { processOFWNow } from './process-ofw-with-pdf.js';
import { getLogger } from '../src/utils/logging.js';
import path from 'path';
import fs from 'fs';

const logger = getLogger();

async function verifyPipeline() {
    logger.info('Starting core pipeline verification...');
    const results = {
        pipeline: {
            status: false,
            pdf_processing: false,
            output_structure: false,
            performance: false
        },
        features: {
            chunking: false,
            metadata: false,
            formats: {
                raw: false,
                notebook: false,
                llm: false
            }
        }
    };

    try {
        // Test core pipeline
        logger.info('Testing core pipeline with test document...');
        const startTime = Date.now();
        const testFile = 'test-data/OFW_Messages_Report_Dec.pdf';
        const pipelineResult = await processOFWNow(testFile);
        const processingTime = Date.now() - startTime;
        
        // Log raw result for debugging
        logger.info('Pipeline result:', JSON.stringify(pipelineResult, null, 2));
        
        // Verify performance (should be around 1.3 seconds)
        results.pipeline.performance = processingTime < 5000;  // Allow up to 5s for safety
        logger.info(`Processing time: ${(processingTime / 1000).toFixed(1)}s`);
        
        // Verify PDF processing
        results.pipeline.pdf_processing = !!(
            pipelineResult &&
            pipelineResult.file_info
        );

        // Verify chunking (using raw output files)
        const rawFiles = fs.readdirSync(pipelineResult.output_structure.raw.path);
        const chunkFiles = rawFiles.filter(f => f.startsWith('chunk-'));
        results.features.chunking = chunkFiles.length > 0;
        
        if (results.features.chunking) {
            logger.info(`Chunks found: ${chunkFiles.length}`);
        }

        // Verify metadata
        results.features.metadata = !!(
            pipelineResult.file_info &&
            pipelineResult.structure &&
            pipelineResult.processing_meta
        );

        // Verify output formats
        const { output_structure } = pipelineResult;
        results.features.formats = {
            raw: fs.existsSync(output_structure.raw.path),
            notebook: fs.existsSync(output_structure.notebook.path),
            llm: fs.existsSync(output_structure.llm.path)
        };

        // Verify output structure
        results.pipeline.output_structure = (
            results.features.formats.raw &&
            results.features.formats.notebook &&
            results.features.formats.llm
        );

        // Set overall status
        results.pipeline.status = (
            results.pipeline.pdf_processing &&
            results.pipeline.output_structure &&
            results.pipeline.performance
        );

        // Log detailed results
        logger.info('Verification complete. Results:', JSON.stringify(results, null, 2));

        // Check if we have everything
        const pipelineComplete = Object.values(results.pipeline).every(v => v);
        const featuresComplete = (
            results.features.chunking &&
            results.features.metadata &&
            Object.values(results.features.formats).every(v => v)
        );

        if (pipelineComplete && featuresComplete) {
            logger.info('SUCCESS: Core pipeline verified!');
            logger.info(`Pipeline performance: ${(processingTime / 1000).toFixed(1)}s`);
            logger.info('Core pipeline is ready for Mission Control integration');
            
            // Log specific metrics
            logger.info('Pipeline metrics:', {
                processing_time_ms: processingTime,
                chunks: chunkFiles.length,
                output_files: {
                    raw: output_structure.raw.files.length,
                    notebook: output_structure.notebook.files.length,
                    llm: output_structure.llm.files.length
                }
            });
            
            return true;
        } else {
            logger.error('FAILURE: Some components are missing or not working:');
            
            if (!pipelineComplete) {
                Object.entries(results.pipeline)
                    .filter(([_, working]) => !working)
                    .forEach(([component]) => 
                        logger.error(`- Pipeline issue: ${component}`)
                    );
            }

            if (!featuresComplete) {
                if (!results.features.chunking) 
                    logger.error('- Missing feature: chunking');
                if (!results.features.metadata) 
                    logger.error('- Missing feature: metadata');
                Object.entries(results.features.formats)
                    .filter(([_, working]) => !working)
                    .forEach(([format]) => 
                        logger.error(`- Missing output format: ${format}`)
                    );
            }

            return false;
        }
    } catch (error) {
        logger.error('Verification failed:', error);
        return false;
    }
}

// Run verification
verifyPipeline().then(success => {
    if (!success) {
        logger.error('Core pipeline verification failed - DO NOT proceed with Mission Control');
        process.exit(1);
    }
});
