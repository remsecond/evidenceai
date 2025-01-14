import path from 'path';
import { fileURLToPath } from 'url';
import { UniversalProcessor } from '../src/services/universal-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMultiSourceTest() {
  try {
    console.log('Starting multi-source pipeline test...\n');

    // Initialize processor
    const processor = new UniversalProcessor();

    // Define test data paths using fixtures
    const TEST_DATA_PATH = path.join(__dirname, '..', 'simple-pdf-processor', 'test', 'fixtures');

    const sources = [
      {
        type: 'ofw_report',
        path: path.join(TEST_DATA_PATH, 'sample-ofw.txt'),
        metadata: {
          type: 'ofw_report',
          timestamp: '2025-01-12T09:01:06Z'
        }
      },
      {
        type: 'email_thread',
        path: path.join(TEST_DATA_PATH, 'sample-email.txt'),
        metadata: {
          type: 'email_thread',
          timestamp: '2025-01-12T09:26:00Z'
        }
      },
      {
        type: 'email_metadata',
        path: path.join(TEST_DATA_PATH, 'sample-records.csv'),
        metadata: {
          type: 'email_metadata',
          timestamp: '2025-01-12T09:37:00Z'
        }
      }
    ];

    // Process each source individually first
    console.log('Processing individual sources...\n');
    
    for (const source of sources) {
      console.log(`Processing ${source.type}...`);
      const result = await processor.processSource(source);
      
      if (result.success) {
        console.log(`✓ Successfully processed ${source.type}`);
        console.log(`  - Found ${result.messages?.length || 0} messages`);
        console.log(`  - Timeframe: ${result.metadata?.timeframe?.start} to ${result.metadata?.timeframe?.end}`);
        console.log(`  - Participants: ${result.metadata?.participants?.length || 0}`);
        
        // Log validation results
        if (result.metadata?.validation) {
          console.log('  - Validation Results:');
          Object.entries(result.metadata.validation).forEach(([type, validation]) => {
            console.log(`    ${type}: ${validation.valid ? '✓' : '✗'} (${Math.round(validation.confidence * 100)}% confidence)`);
            if (validation.issues?.length > 0) {
              console.log('    Issues:');
              validation.issues.forEach(issue => {
                console.log(`      - ${issue.message}`);
              });
            }
          });
        }
      } else {
        console.error(`✗ Failed to process ${source.type}: ${result.error}`);
      }
      console.log();
    }

    // Process attachments
    console.log('Processing attachments...\n');
    const attachmentResults = await processor.processAttachments(TEST_DATA_PATH);
    
    if (attachmentResults.success) {
      console.log('✓ Successfully processed attachments');
      console.log(`  - Processed ${attachmentResults.processed.length} files`);
      console.log('  - Types:', attachmentResults.metadata.types);
    } else {
      console.error('✗ Failed to process attachments:', attachmentResults.error);
    }
    console.log();

    // Run full pipeline
    console.log('Running full pipeline...\n');
    const output = await processor.processAll({
      sources,
      attachments: {
        path: TEST_DATA_PATH
      }
    });

    // Log pipeline results
    console.log('Pipeline Results:\n');

    // Source integration
    console.log('Source Integration:');
    Object.entries(output.metadata.sources).forEach(([source, info]) => {
      console.log(`  ${source}: ${info.type} (${info.timestamp})`);
    });
    console.log();

    // Timeline
    console.log('Timeline Analysis:');
    console.log(`  Events: ${output.timeline.events.length}`);
    console.log(`  Patterns: ${output.timeline.patterns.length}`);
    console.log(`  Confidence: ${Math.round(output.timeline.confidence * 100)}%`);
    if (output.timeline.patterns.length > 0) {
      console.log('  Detected Patterns:');
      output.timeline.patterns.forEach(pattern => {
        console.log(`    - ${pattern.type} (${Math.round(pattern.confidence * 100)}% confidence)`);
      });
    }
    console.log();

    // Content Analysis
    console.log('Content Analysis:');
    console.log(`  Messages: ${output.content.messages.length}`);
    console.log(`  Attachments: ${output.content.attachments.length}`);
    console.log(`  Relationships: ${output.content.relationships.length}`);
    console.log();

    // Verification Results
    console.log('Verification Results:');
    console.log(`  Status: ${output.verification.status}`);
    console.log(`  Confidence: ${Math.round(output.verification.confidence * 100)}%`);
    console.log('  Methods:', output.verification.methods);
    console.log();

    // Relationship Analysis
    console.log('Relationship Analysis:');
    console.log(`  Data Points: ${output.relationships.data.length}`);
    console.log(`  Patterns: ${output.relationships.patterns.length}`);
    console.log(`  Confidence: ${Math.round(output.relationships.confidence * 100)}%`);
    if (output.relationships.patterns.length > 0) {
      console.log('  Detected Patterns:');
      output.relationships.patterns.forEach(pattern => {
        console.log(`    - ${pattern.type}`);
      });
    }
    console.log();

    // Final Summary
    const overallConfidence = Math.round(
      (output.timeline.confidence +
       output.relationships.confidence +
       output.verification.confidence) / 3 * 100
    );

    console.log('Final Summary:');
    console.log(`✓ Successfully processed ${sources.length} sources and ${output.content.attachments.length} attachments`);
    console.log(`✓ Generated unified timeline with ${output.timeline.events.length} events`);
    console.log(`✓ Identified ${output.relationships.patterns.length} relationship patterns`);
    console.log(`✓ Overall confidence: ${overallConfidence}%`);

    return {
      success: true,
      confidence: overallConfidence / 100,
      output
    };

  } catch (error) {
    console.error('Pipeline test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMultiSourceTest().catch(console.error);
}

export { runMultiSourceTest };
