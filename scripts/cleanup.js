#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const rmdir = promisify(fs.rm);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Directories to clean
const cleanupDirs = [
  'ai-outputs',
  'processed',
  'logs',
  'test-data/results',
  'test-data/pdf-check',
  'coverage'
];

// Files to preserve (won't be deleted even if in cleanup dirs)
const preserveFiles = [
  '.gitkeep',
  'README.md',
  'metadata/ofw_template.json'
];

async function isDirectory(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function cleanDirectory(dir) {
  console.log(`Cleaning directory: ${dir}`);
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      // Skip preserved files
      if (preserveFiles.includes(file)) {
        console.log(`Preserving: ${file}`);
        continue;
      }

      const fullPath = path.join(dir, file);
      
      if (await isDirectory(fullPath)) {
        // Recursively clean subdirectories
        await cleanDirectory(fullPath);
        // Remove empty directory
        try {
          await rmdir(fullPath, { recursive: true });
          console.log(`Removed directory: ${fullPath}`);
        } catch (err) {
          console.error(`Error removing directory ${fullPath}:`, err.message);
        }
      } else {
        // Remove file
        try {
          await fs.promises.unlink(fullPath);
          console.log(`Removed file: ${fullPath}`);
        } catch (err) {
          console.error(`Error removing file ${fullPath}:`, err.message);
        }
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Directory doesn't exist: ${dir}`);
    } else {
      console.error(`Error cleaning directory ${dir}:`, err.message);
    }
  }
}

async function cleanup() {
  console.log('Starting system cleanup...');
  
  // Clean each directory
  for (const dir of cleanupDirs) {
    await cleanDirectory(dir);
  }
  
  console.log('Cleanup complete!');
  
  // Print summary of freed space (if needed)
  // TODO: Add space calculation
}

// Run cleanup
cleanup().catch(console.error);
