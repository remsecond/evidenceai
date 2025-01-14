import { processOFWNow } from './process-ofw-with-pdf.js';
import googleSheets from '../src/services/google-sheets.js';
import { getLogger } from '../src/utils/logging.js';
import path from 'path';
import fs from 'fs';

const logger = getLogger();

async function verifyMcpTools(filePath) {
    logger.info('Verifying MCP tools...');
    
    try {
        // 1. Analyze document
        logger.info('Testing document analysis...');
        const analysisResult = await global.useMcpTool('pdf', 'analyze_document', {
            file_path: filePath
        });
        logger.info('Analysis result:', analysisResult);

        // 2. Extract content with multiple tools
        logger.info('Testing content extraction...');
        const extractionResult = await global.useMcpTool('pdf', 'extract_content', {
            file_path: filePath,
            extractors: ['fitz', 'pdfminer']
        });
        logger.info('Extraction result:', extractionResult);

        // 3. Extract structure
        logger.info('Testing structure extraction...');
        const structureResult = await global.useMcpTool('pdf', 'extract_structure', {
            file_path: filePath
        });
        logger.info('Structure result:', structureResult);

        return {
            analysis: !!analysisResult,
            extraction: !!extractionResult,
            structure: !!structureResult,
            parallel: extractionResult?.metadata?.extractors_used?.length > 1
        };
    } catch (error) {
        logger.error('MCP verification failed:', error);
        return {
            analysis: false,
            extraction: false,
            structure: false,
            parallel: false
        };
    }
}

async function verifyGoogleSheets(docId, metadata) {
    logger.info('Verifying Google Sheets integration...');
    
    try {
        // 1. Add document
        await googleSheets.addDocument({
            id: docId,
            fileName: path.basename(metadata.file_path),
            type: 'PDF',
            pages: metadata.statistics.pages || 0,
            wordCount: metadata.statistics.words || 0,
            processingTime: `${metadata.processing_time}s`,
            outputLocation: metadata.output_path
        });

        // 2. Update status
        await googleSheets.updateStatus(docId, {
            status: 'Processed',
            stage: 'Verification',
            message: 'Pipeline verification test'
        });

        // 3. Verify sheet connection and data
        const sheet = await googleSheets.getSheet();
        const data = await googleSheets.getDocumentData(docId);

        return {
            connection: !!sheet,
            document_added: !!data,
            status_updated: data?.status === 'Processed'
        };
    } catch (error) {
        logger.error('Google Sheets verification failed:', error);
        return {
            connection: false,
            document_added: false,
            status_updated: false
        };
    }
}

async function verifyPipeline() {
    logger.info('Starting full pipeline verification...');
    const results = {
        pipeline: {
            status: false,
            pdf_processing: false,
            output_structure: false,
            performance: false
        },
        mcp: {
            status: false,
            analysis: false,
            extraction: false,
            structure: false,
            parallel: false
        },
        google_sheets: {
            status: false,
            connection: false,
            document_added: false,
            status_updated: false
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
        // Test with real OFW file
        const testFile = 'C:\\Users\\robmo\\OneDrive\\Documents\\evidenceai_test\\input\\OFW Messages\\All OFW Messages_Part3.pdf';
        logger.info('Testing pipeline with file:', testFile);
        
        // 1. Core Pipeline
        const startTime = Date.now();
        const pipelineResult = await processOFWNow(testFile);
        const processingTime = Date.now() - startTime;
        
        // Log raw result for debugging
        logger.info('Pipeline result:', JSON.stringify(pipelineResult, null, 2));
        
        // Verify performance
        results.pipeline.performance = processingTime < 10000;  // Allow up to 10s for large file
        logger.info(`Processing time: ${(processingTime / 1000).toFixed(1)}s`);
        
        // Verify PDF processing
        results.pipeline.pdf_processing = !!(
            pipelineResult &&
            pipelineResult.file_info
        );

        // Verify chunking
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

        // 2. MCP Tools
        const mcpResults = await verifyMcpTools(testFile);
        results.mcp = {
            ...mcpResults,
            status: Object.values(mcpResults).every(v => v)
        };

        // 3. Google Sheets
        const docId = `TEST-${Date.now()}`;
        const sheetsResults = await verifyGoogleSheets(docId, {
            file_path: testFile,
            statistics: pipelineResult.statistics,
            processing_time: (processingTime / 1000).toFixed(1),
            output_path: output_structure.raw.path
        });
        results.google_sheets = {
            ...sheetsResults,
            status: Object.values(sheetsResults).every(v => v)
        };

        // Log detailed results
        logger.info('Verification complete. Results:', JSON.stringify(results, null, 2));

        // Check if we have everything
        const pipelineComplete = Object.values(results.pipeline).every(v => v);
        const mcpComplete = Object.values(results.mcp).every(v => v);
        const sheetsComplete = Object.values(results.google_sheets).every(v => v);
        const featuresComplete = (
            results.features.chunking &&
            results.features.metadata &&
            Object.values(results.features.formats).every(v => v)
        );

        if (pipelineComplete && mcpComplete && sheetsComplete && featuresComplete) {
            logger.info('SUCCESS: Full pipeline verified!');
            logger.info(`Pipeline performance: ${(processingTime / 1000).toFixed(1)}s`);
            logger.info('System is ready for Mission Control integration');
            
            // Log specific metrics
            logger.info('Pipeline metrics:', {
                processing_time_ms: processingTime,
                chunks: chunkFiles.length,
                output_files: {
                    raw: output_structure.raw.files.length,
                    notebook: output_structure.notebook.files.length,
                    llm: output_structure.llm.files.length
                },
                mcp_tools: {
                    analysis: mcpResults.analysis,
                    extraction: mcpResults.extraction,
                    structure: mcpResults.structure,
                    parallel: mcpResults.parallel
                },
                google_sheets: {
                    connection: sheetsResults.connection,
                    document: docId,
                    tracking: sheetsResults.document_added,
                    status: sheetsResults.status_updated
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

            if (!mcpComplete) {
                Object.entries(results.mcp)
                    .filter(([_, working]) => !working)
                    .forEach(([component]) => 
                        logger.error(`- MCP issue: ${component}`)
                    );
            }

            if (!sheetsComplete) {
                Object.entries(results.google_sheets)
                    .filter(([_, working]) => !working)
                    .forEach(([component]) => 
                        logger.error(`- Google Sheets issue: ${component}`)
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
        logger.error('Full pipeline verification failed - DO NOT proceed with Mission Control');
        process.exit(1);
    }
});
