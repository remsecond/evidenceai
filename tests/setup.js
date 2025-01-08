import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise during tests

// Configure AI services for testing
process.env.SONNET_ENABLED = 'true';
process.env.SONNET_API_KEY = 'test-sonnet-key';
process.env.NOTEBOOKLM_ENABLED = 'false';
process.env.DEEPSEEK_ENABLED = 'false';
process.env.GPT4_ENABLED = 'false';

// Create mock directories that our app expects to exist
import fs from 'fs';
import path from 'path';

const dirs = [
    'logs',
    'uploads',
    'processed',
    'ai-outputs/sonnet',
    'ai-outputs/notebooklm',
    'ai-outputs/deepseek',
    'ai-outputs/gpt4'
];
dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Global test timeouts
jest.setTimeout(10000); // 10 second timeout

// Global mocks
global.console = {
    ...console,
    // Silence console.log during tests
    log: jest.fn(),
    // Keep error and warn for debugging
    error: console.error,
    warn: console.warn,
};

// Clean up function to run after each test
afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
});

// Clean up function to run after all tests
afterAll(() => {
    // Clean up test directories if needed
    if (process.env.NODE_ENV === 'test') {
        dirs.forEach(dir => {
            const dirPath = path.join(process.cwd(), dir);
            if (fs.existsSync(dirPath)) {
                // Only remove contents, not the directory itself
                const files = fs.readdirSync(dirPath);
                files.forEach(file => {
                    const filePath = path.join(dirPath, file);
                    fs.unlinkSync(filePath);
                });
            }
        });
    }

    // Reset all environment variables
    process.env.SONNET_ENABLED = undefined;
    process.env.SONNET_API_KEY = undefined;
    process.env.NOTEBOOKLM_ENABLED = undefined;
    process.env.DEEPSEEK_ENABLED = undefined;
    process.env.GPT4_ENABLED = undefined;
});

// Mock AI service outputs directory structure
const aiOutputDirs = ['sonnet', 'notebooklm', 'deepseek', 'gpt4'];
aiOutputDirs.forEach(dir => {
    const outputDir = path.join(process.cwd(), 'ai-outputs', dir);
    const inputDir = path.join(outputDir, 'input');
    const outputSubDir = path.join(outputDir, 'output');
    
    [outputDir, inputDir, outputSubDir].forEach(d => {
        if (!fs.existsSync(d)) {
            fs.mkdirSync(d, { recursive: true });
        }
    });
});
