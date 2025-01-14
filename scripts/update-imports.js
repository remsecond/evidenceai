#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Old to new path mappings
const pathMappings = {
  'src/services/pdf-processor': 'src/processors/pdf-processor',
  'src/services/base-processor': 'src/processors/base-processor',
  'src/services/universal-processor': 'src/processors/universal-processor',
  'src/services/conversation-processor': 'src/processors/conversation-processor',
  'src/services/llm-scoring': 'src/processors/llm-scoring',
  'src/services/multi-llm-processor': 'src/processors/multi-llm-processor',
  'src/services/validators/': 'src/validators/',
  'src/services/extractors/': 'src/extractors/',
  'scripts/mission-control-server': 'src/servers/mission-control-server',
  'scripts/pipeline-server': 'src/servers/pipeline-server',
  'scripts/web-server': 'src/servers/web-server',
  'scripts/timeline-server': 'src/servers/timeline-server'
};

// Directories to scan for JS/TS files
const dirsToScan = [
  'src/processors',
  'src/validators',
  'src/extractors',
  'src/servers',
  'test/unit',
  'test/integration',
  'test/e2e',
  'scripts/process',
  'scripts/utils'
];

async function updateImports(filePath, content) {
  let updatedContent = content;
  
  // Update import paths
  for (const [oldPath, newPath] of Object.entries(pathMappings)) {
    const importRegex = new RegExp(`(require\\(['"]|import .* from ['"])${oldPath}`, 'g');
    updatedContent = updatedContent.replace(importRegex, `$1${newPath}`);
  }

  // Update relative paths based on new file location
  const fileDir = path.dirname(filePath);
  for (const [oldPath, newPath] of Object.entries(pathMappings)) {
    const relativePath = path.relative(fileDir, newPath).replace(/\\/g, '/');
    const relativeRegex = new RegExp(`(require\\(['"]|import .* from ['"])\\.\\.?/.*?${path.basename(oldPath)}`, 'g');
    updatedContent = updatedContent.replace(relativeRegex, `$1${relativePath.startsWith('.') ? relativePath : './' + relativePath}`);
  }

  return updatedContent;
}

async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const updatedContent = await updateImports(filePath, content);
    
    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, 'utf8');
      console.log(`Updated imports in: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

async function scanDirectory(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
        await processFile(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dir}:`, err);
  }
}

async function main() {
  console.log('Starting import path updates...\n');

  try {
    for (const dir of dirsToScan) {
      await scanDirectory(dir);
    }

    console.log('\nImport path updates completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review changes in source control');
    console.log('2. Test all components');
    console.log('3. Update any remaining path references in configuration files');
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

main();
