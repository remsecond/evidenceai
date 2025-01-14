#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';

// Files to be archived (moved to archive directory)
const filesToArchive = [
  // PDF extraction scripts
  'scripts/adobe_extract.py',
  'scripts/fitz_extract.py',
  'scripts/pdf_extract.py',
  'scripts/pdfminer_extract.py',
  'scripts/pike_extract.py',
  'scripts/tika_extract.py',
  'scripts/pdf-check.js',
  'scripts/pdf2txt.bat',
  
  // Simple test files
  'scripts/simple-test.cjs',
  'scripts/test-and-save.js',
  
  // Redundant process scripts
  'scripts/process-ofw-now.js',
  'scripts/process-ofw-simple.js',
  
  // Old server implementations
  'scripts/simple-pipeline-server.js',
  'scripts/test-server.js'
];

// Directories to create
const directoriesToCreate = [
  'archive/scripts',
  'archive/docs',
  'src/processors',
  'src/validators', 
  'src/extractors',
  'src/utils',
  'src/servers',
  'test/unit',
  'test/integration',
  'test/e2e',
  'test/fixtures',
  'docs/architecture',
  'docs/processes',
  'docs/strategy',
  'scripts/utils',
  'scripts/process',
  'Web/components',
  'Web/styles'
];

// Documentation files to organize
const docsToOrganize = {
  'docs/architecture/': [
    'docs/COMPREHENSIVE_SYSTEM_DESIGN.md',
    'docs/ENHANCED_PDF_PIPELINE.md',
    'docs/EVIDENCE_CHAIN_ARCHITECTURE.md',
    'docs/FINAL_ARCHITECTURE.md'
  ],
  'docs/processes/': [
    'docs/PROCESSING_APPROACHES.md',
    'docs/PIPELINE_IMPROVEMENTS.md',
    'docs/PIPELINE_DEBUG.md',
    'docs/TESTING_GUIDE.md'
  ],
  'docs/strategy/': [
    'docs/PRODUCT_STRATEGY.md',
    'docs/TAGSPACE_VISION.md',
    'docs/EVOLUTION_VISION.md',
    'docs/LENS_CONCEPT.md'
  ]
};

async function createDirectories() {
  console.log('Creating directory structure...');
  for (const dir of directoriesToCreate) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error(`Error creating directory ${dir}:`, err);
      }
    }
  }
}

async function archiveFiles() {
  console.log('\nArchiving old files...');
  for (const file of filesToArchive) {
    try {
      const archivePath = join('archive', file);
      const archiveDir = dirname(archivePath);
      
      await fs.mkdir(archiveDir, { recursive: true });
      
      try {
        await fs.access(file);
        await fs.rename(file, archivePath);
        console.log(`Archived: ${file} -> ${archivePath}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(`File not found (skipping): ${file}`);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error(`Error archiving ${file}:`, err);
    }
  }
}

async function organizeDocumentation() {
  console.log('\nOrganizing documentation...');
  for (const [targetDir, files] of Object.entries(docsToOrganize)) {
    for (const file of files) {
      try {
        const fileName = basename(file);
        const targetPath = join(targetDir, fileName);
        
        try {
          await fs.access(file);
          await fs.rename(file, targetPath);
          console.log(`Moved: ${file} -> ${targetPath}`);
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.log(`File not found (skipping): ${file}`);
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.error(`Error organizing ${file}:`, err);
      }
    }
  }
}

async function main() {
  console.log('Starting project cleanup...\n');
  
  try {
    await createDirectories();
    await archiveFiles();
    await organizeDocumentation();
    
    console.log('\nCleanup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review archived files and delete if no longer needed');
    console.log('2. Update import paths in remaining files');
    console.log('3. Run tests to verify functionality');
    console.log('4. Update documentation with new file locations');
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

main();
