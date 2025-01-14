#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Files to move with their target directories
const filesToMove = {
  // Unit Tests
  'test-base-processor.js': 'test/unit/base-processor.test.js',
  'test-pdf-processor.js': 'test/unit/pdf-processor.test.js',
  'test/unit/llm-scoring.test.js': 'test/unit/llm-scoring.test.js',
  'test/unit/multi-llm-processor.test.js': 'test/unit/multi-llm-processor.test.js',
  'test-attribution-accuracy.js': 'test/unit/attribution-accuracy.test.js',

  // Integration Tests
  'test-processor-scenarios.js': 'test/integration/processor-scenarios.test.js',
  'test-real-data-processor.js': 'test/integration/real-data-processor.test.js',
  'test-safeco-scenario.js': 'test/integration/safeco-scenario.test.js',
  'test-multi-source-pipeline.js': 'test/integration/multi-source-pipeline.test.js',

  // E2E Tests
  'test-full-pipeline.bat': 'test/e2e/full-pipeline.bat',
  'test-chatgpt-prep.js': 'test/e2e/chatgpt-prep.test.js',
  'test-timeline-scenario.js': 'test/e2e/timeline-scenario.test.js',

  // Core Servers
  'scripts/mission-control-server.js': 'src/servers/mission-control-server.js',
  'scripts/pipeline-server.js': 'src/servers/pipeline-server.js',
  'scripts/web-server.js': 'src/servers/web-server.js',
  'scripts/timeline-server.js': 'src/servers/timeline-server.js',

  // Processors
  'src/services/pdf-processor.js': 'src/processors/pdf-processor.js',
  'src/services/base-processor.js': 'src/processors/base-processor.js',
  'src/services/universal-processor.js': 'src/processors/universal-processor.js',
  'src/services/conversation-processor.js': 'src/processors/conversation-processor.js',
  'src/services/llm-scoring.js': 'src/processors/llm-scoring.js',
  'src/services/multi-llm-processor.js': 'src/processors/multi-llm-processor.js',

  // Validators
  'src/services/validators/temporal-validator.js': 'src/validators/temporal-validator.js',
  'src/services/validators/content-validator.js': 'src/validators/content-validator.js',
  'src/services/validators/reference-validator.js': 'src/validators/reference-validator.js',
  'src/services/attribution-validator.js': 'src/validators/attribution-validator.js',

  // Extractors
  'src/services/extractors/pdf-extractor.js': 'src/extractors/pdf-extractor.js',
  'src/services/extractors/email-extractor.js': 'src/extractors/email-extractor.js',
  'src/services/extractors/ods-extractor.js': 'src/extractors/ods-extractor.js',
  'src/services/extractors/attachment-processor.js': 'src/extractors/attachment-processor.js',

  // Web Components
  'Web/components/llm-comparison.html': 'Web/components/llm-comparison.html',
  'Web/mission-control-simple.html': 'Web/components/mission-control-simple.html',
  'Web/mission-control-timeline.html': 'Web/components/mission-control-timeline.html',
  'Web/mission-control-llm.html': 'Web/components/mission-control-llm.html',
  'Web/mission-control-main.html': 'Web/components/mission-control-main.html',
  'Web/mission-control.html': 'Web/components/mission-control.html',
  'Web/styles.css': 'Web/styles/main.css',

  // Process Scripts
  'scripts/process-evidence.js': 'scripts/process/process-evidence.js',
  'scripts/process-ofw-with-pdf.js': 'scripts/process/process-ofw-with-pdf.js',
  'scripts/process-test-data.js': 'scripts/process/process-test-data.js',

  // Utility Scripts
  'scripts/verify-pipeline.js': 'scripts/utils/verify-pipeline.js',
  'scripts/verify-core-pipeline.js': 'scripts/utils/verify-core-pipeline.js',
  'scripts/verify-full-pipeline.js': 'scripts/utils/verify-full-pipeline.js',
  'scripts/debug-pipeline.js': 'scripts/utils/debug-pipeline.js'
};

async function moveFile(source, target) {
  try {
    // Create target directory if it doesn't exist
    const targetDir = path.dirname(target);
    await fs.mkdir(targetDir, { recursive: true });

    // Check if source exists
    try {
      await fs.access(source);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(`Source file not found (skipping): ${source}`);
        return;
      }
      throw err;
    }

    // Move the file
    await fs.rename(source, target);
    console.log(`Moved: ${source} -> ${target}`);
  } catch (err) {
    console.error(`Error moving ${source}:`, err);
  }
}

async function main() {
  console.log('Starting file consolidation...\n');

  try {
    // Move files to their new locations
    for (const [source, target] of Object.entries(filesToMove)) {
      await moveFile(source, target);
    }

    console.log('\nConsolidation completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update import paths in all files');
    console.log('2. Test all components in new locations');
    console.log('3. Update startup/shutdown scripts');
    console.log('4. Update documentation references');
  } catch (err) {
    console.error('Consolidation failed:', err);
    process.exit(1);
  }
}

main();
