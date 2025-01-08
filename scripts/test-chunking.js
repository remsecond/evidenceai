import { analyzeText, summarizeText, generateText } from '../src/services/ai.js';
import fs from 'fs';
import path from 'path';

async function testChunking() {
    try {
        console.log('Starting chunking test...');

        // Read test file
        const testPath = path.join(process.cwd(), 'tests/fixtures/large_test.txt');
        const content = fs.readFileSync(testPath, 'utf8');
        const estimatedTokens = Math.ceil(content.length / 4); // Rough estimate: 4 chars per token
        console.log(`Loaded test file: ${content.length} characters (≈${estimatedTokens} tokens)`);

        // Test analysis chunking
        console.log('\nTesting analyzeText...');
        console.log('Expected chunks:', Math.ceil(estimatedTokens / 150000));
        const analysisResult = await analyzeText(content);
        console.log('Analysis complete.');
        console.log('Semantic results:', {
            key_points: analysisResult.semantic.key_points.length,
            patterns: analysisResult.semantic.initial_patterns.length,
            confidence: analysisResult.semantic.confidence
        });
        console.log('Entity results:', {
            people: analysisResult.entities.entities.people.length,
            organizations: analysisResult.entities.entities.organizations.length,
            dates: analysisResult.entities.entities.dates.length,
            relationships: analysisResult.entities.relationships.length
        });

        // Test summarization chunking
        console.log('\nTesting summarizeText...');
        console.log('Expected chunks:', Math.ceil(estimatedTokens / 150000));
        const summaryResult = await summarizeText(content);
        console.log('Summarization complete.');
        console.log('Summary length:', summaryResult.length);
        console.log('Sentence count:', summaryResult.sentence_count);
        console.log('Confidence:', summaryResult.confidence);
        console.log('Actual chunks used:', summaryResult.chunk_count || 1);

        // Test generation chunking
        console.log('\nTesting generateText...');
        console.log('Expected chunks:', Math.ceil(estimatedTokens / 150000));
        const generationResult = await generateText(content, {
            prompt: "Analyze this custody record and identify key patterns"
        });
        console.log('Generation complete.');
        console.log('Generated text length:', generationResult.text.length);
        console.log('Token count:', generationResult.tokens);
        console.log('Model used:', generationResult.model);
        console.log('Chunks processed:', generationResult.chunk_count || 1);

        console.log('\nChunking test completed successfully');
    } catch (error) {
        console.error('Chunking test failed:', error);
        throw error;
    }
}

testChunking().catch(console.error);
