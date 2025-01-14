import { processOFWNow } from './process-ofw-with-pdf.js';
import googleSheets from '../src/services/google-sheets.js';
import { getLogger } from '../src/utils/logging.js';
import deepseekProcessor from '../src/services/models/deepseek-processor.js';
import path from 'path';
import fs from 'fs';

const logger = getLogger();

async function verifyMcpTools() {
    logger.info('Verifying MCP tools...');
    
    try {
        // Use the system's use_mcp_tool
        const analysisResult = await global.useMcpTool('pdf', 'analyze_document', {
            file_path: 'test-data/OFW_Messages_Report_Dec.pdf'
        });

        const extractionResult = await global.useMcpTool('pdf', 'extract_content', {
            file_path: 'test-data/OFW_Messages_Report_Dec.pdf',
            extractors: ['fitz', 'pdfminer']
        });

        const structureResult = await global.useMcpTool('pdf', 'extract_structure', {
            file_path: 'test-data/OFW_Messages_Report_Dec.pdf'
        });

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

async function verifyPipeline() {
    logger.info('Starting pipeline verification...');
    const results = {
        pipeline: {
            status: false,
            pdf_processing: false,
            deepseek: false,
            output_structure: false,
            performance: false
        },
        google_sheets: {
            status: false,
            tracking: false,
            updates: false
        },
        mcp: {
            status: false,
            analysis: false,
            extraction: false,
            structure: false,
            parallel: false
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
        // 1. Test core pipeline
        logger.info('Testing core pipeline with test document...');
        const startTime = Date.now();
        const testFile = 'test-data/OFW_Messages_Report_Dec.pdf';
        const pipelineResult = await processOFWNow(testFile);
        const processingTime = Date.now() - startTime;
        
        // Verify performance (should be around 1.3 seconds)
        results.pipeline.performance = processingTime < 2000;
        
        // Verify PDF processing
        results.pipeline.pdf_processing = !!(
            pipelineResult &&
            pipelineResult.statistics &&
            pipelineResult.statistics.words > 0 &&
            pipelineResult.statistics.pages > 0
        );

        // Verify chunking
        results.features.chunking = !!(
            pipelineResult.statistics.chunks > 0 &&
            Array.isArray(pipelineResult.raw_content.chunks)
        );

        // Verify metadata
        results.features.metadata = !!(
            pipelineResult.metadata &&
            pipelineResult.metadata.title &&
            pipelineResult.metadata.created
        );

        // Verify output formats
        const outputBase = path.join(process.cwd(), 'outputs');
        results.features.formats = {
            raw: fs.existsSync(path.join(outputBase, 'raw')),
            notebook: fs.existsSync(path.join(outputBase, 'notebook')),
            llm: fs.existsSync(path.join(outputBase, 'llm'))
        };

        // Verify output structure
        results.pipeline.output_structure = (
            results.features.formats.raw &&
            results.features.formats.notebook &&
            results.features.formats.llm
        );

        // 2. Test DeepSeek integration
        logger.info('Testing DeepSeek integration...');
        const sampleText = pipelineResult.raw_content.chunks[0].text;
        const deepseekResult = await deepseekProcessor.analyze(sampleText);
        results.pipeline.deepseek = !!(
            deepseekResult &&
            deepseekResult.analysis &&
            deepseekResult.summary
        );

        // 3. Test Google Sheets integration
        logger.info('Testing Google Sheets integration...');
        const docId = `TEST-${Date.now()}`;
        
        // Test document addition
        await googleSheets.addDocument({
            id: docId,
            fileName: path.basename(testFile),
            type: 'PDF',
            pages: pipelineResult.statistics.pages,
            wordCount: pipelineResult.statistics.words,
            processingTime: `${(processingTime / 1000).toFixed(1)}s`,
            outputLocation: 'outputs/test'
        });
        results.google_sheets.tracking = true;

        // Test status updates
        await googleSheets.updateStatus(docId, {
            status: 'Test Complete',
            stage: 'Verification',
            message: 'Pipeline verification test'
        });
        results.google_sheets.updates = true;

        // Verify sheet connection
        const sheet = await googleSheets.getSheet();
        results.google_sheets.status = !!sheet;

        // 4. Test MCP tools
        logger.info('Testing MCP integration...');
        const mcpResults = await verifyMcpTools();
        results.mcp = {
            status: true,  // Will be updated based on other results
            ...mcpResults
        };
        results.mcp.status = Object.values(mcpResults).every(v => v);

        // Log detailed results
        logger.info('Verification complete. Results:', JSON.stringify(results, null, 2));

        // Check if we have everything
        const pipelineComplete = Object.values(results.pipeline).every(v => v);
        const sheetsComplete = Object.values(results.google_sheets).every(v => v);
        const mcpComplete = Object.values(results.mcp).every(v => v);
        const featuresComplete = (
            results.features.chunking &&
            results.features.metadata &&
            Object.values(results.features.formats).every(v => v)
        );

        if (pipelineComplete && sheetsComplete && mcpComplete && featuresComplete) {
            logger.info('SUCCESS: All components verified!');
            logger.info(`Pipeline performance: ${(processingTime / 1000).toFixed(1)}s`);
            logger.info('System is ready for Mission Control integration');
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

            if (!sheetsComplete) {
                Object.entries(results.google_sheets)
                    .filter(([_, working]) => !working)
                    .forEach(([component]) => 
                        logger.error(`- Google Sheets issue: ${component}`)
                    );
            }

            if (!mcpComplete) {
                Object.entries(results.mcp)
                    .filter(([_, working]) => !working)
                    .forEach(([component]) => 
                        logger.error(`- MCP issue: ${component}`)
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
        logger.error('Pipeline verification failed - DO NOT proceed with Mission Control');
        process.exit(1);
    }
});
