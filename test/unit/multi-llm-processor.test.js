import { expect } from 'chai';
import MultiLLMProcessor from '../../src/services/multi-llm-processor.js';

describe('MultiLLMProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new MultiLLMProcessor();
    });

    describe('selectModels', () => {
        it('should select appropriate models based on task requirements', () => {
            const task = "Analyze this technical documentation and provide code examples";
            const context = { content: "Sample documentation content" };

            const selection = processor.selectModels(task, context);
            
            expect(selection).to.have.all.keys('primary', 'secondary', 'fallback');
            expect(selection.primary).to.be.an('array');
            expect(selection.fallback).to.equal('gpt4');
        });

        it('should handle tasks with large context', () => {
            const task = "Analyze this large document";
            const context = { content: "A".repeat(50000) }; // Large context

            const selection = processor.selectModels(task, context);
            
            // Only models with sufficient context limits should be selected
            expect(selection.primary.every(model => 
                processor.modelConfigs[model].contextLimit >= 50000
            )).to.be.true;
        });

        it('should always provide at least one model', () => {
            const task = "Some undefined task";
            const selection = processor.selectModels(task);
            
            expect(selection.primary.length + selection.secondary.length).to.be.at.least(1);
        });
    });

    describe('processWithModels', () => {
        it('should process task with multiple models', async () => {
            const task = "Test task";
            const models = ['gpt4', 'claude'];
            const context = { data: "test" };

            const results = await processor.processWithModels(task, models, context);
            
            expect(results).to.have.property('bestResponse');
            expect(results).to.have.property('scores');
            expect(results).to.have.property('consensus');
            expect(results).to.have.property('recommendations');
        });

        it('should handle model errors gracefully', async () => {
            const task = "Test task";
            const models = ['invalid-model', 'gpt4'];

            const results = await processor.processWithModels(task, models);
            
            expect(results.errors).to.be.an('array');
            expect(results.recommendations).to.be.an('array');
        });
    });

    describe('_analyzeTaskRequirements', () => {
        it('should identify code-related requirements', () => {
            const task = "Write a JavaScript function to sort an array";
            const requirements = processor._analyzeTaskRequirements(task);
            
            expect(requirements).to.include('code');
        });

        it('should identify analysis requirements', () => {
            const task = "Analyze this technical document";
            const requirements = processor._analyzeTaskRequirements(task);
            
            expect(requirements).to.include('analysis');
        });

        it('should identify long-context requirements', () => {
            const task = "A".repeat(5000); // Long task
            const requirements = processor._analyzeTaskRequirements(task);
            
            expect(requirements).to.include('long-context');
        });
    });

    describe('_generateConsensus', () => {
        it('should find common elements in responses', () => {
            const responses = {
                model1: { content: "Point A. Point B. Point C." },
                model2: { content: "Point B. Point D. Point E." },
                model3: { content: "Point B. Point C. Point F." }
            };

            const consensus = processor._generateConsensus(responses);
            
            expect(consensus).to.include('Point B');
        });

        it('should handle empty responses', () => {
            const responses = {};
            const consensus = processor._generateConsensus(responses);
            
            expect(consensus).to.be.an('array');
            expect(consensus).to.be.empty;
        });
    });

    describe('_generateRecommendations', () => {
        it('should generate recommendations based on results', () => {
            const results = {
                bestResponse: 'gpt4',
                scores: {
                    'gpt4': { total: 0.9 },
                    'claude': { total: 0.4 }
                }
            };
            const errors = [];

            const recommendations = processor._generateRecommendations(results, errors);
            
            expect(recommendations).to.be.an('array');
            expect(recommendations.length).to.be.at.least(1);
            expect(recommendations[0]).to.include('gpt4');
        });

        it('should include error-related recommendations', () => {
            const results = {
                bestResponse: 'gpt4',
                scores: { 'gpt4': { total: 0.9 } }
            };
            const errors = [{ model: 'claude', error: 'Test error' }];

            const recommendations = processor._generateRecommendations(results, errors);
            
            expect(recommendations.some(r => r.toLowerCase().includes('complexity'))).to.be.true;
        });
    });

    describe('_exportResults', () => {
        it('should export analysis results', async () => {
            const analysis = {
                bestResponse: 'gpt4',
                scores: {
                    'gpt4': { total: 0.9 }
                },
                consensus: ['Point A', 'Point B'],
                recommendations: ['Use gpt4 for similar tasks']
            };
            const task = "Test task";

            try {
                await processor._exportResults(analysis, task);
                // If no error is thrown, test passes
                expect(true).to.be.true;
            } catch (error) {
                expect.fail('Should not throw error');
            }
        });
    });
});
