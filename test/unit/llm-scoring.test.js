import { expect } from 'chai';
import LLMScoring from '../../src/services/llm-scoring.js';

describe('LLMScoring', () => {
    let scorer;

    beforeEach(() => {
        scorer = new LLMScoring();
    });

    describe('calculateResponseScore', () => {
        it('should calculate scores for a valid response', () => {
            const response = {
                content: 'Test response content',
                metadata: { responseTime: 1000 }
            };

            const score = scorer.calculateResponseScore(response);
            
            expect(score).to.have.property('total');
            expect(score).to.have.property('breakdown');
            expect(score.breakdown).to.have.all.keys('accuracy', 'consistency', 'performance');
            expect(score.total).to.be.a('number').and.to.be.within(0, 1);
        });

        it('should handle responses with missing metadata', () => {
            const response = {
                content: 'Test response content'
            };

            const score = scorer.calculateResponseScore(response);
            
            expect(score.total).to.be.a('number').and.to.be.within(0, 1);
        });
    });

    describe('compareResponses', () => {
        it('should compare multiple model responses', () => {
            const responses = {
                'model1': {
                    content: 'Response from model 1',
                    metadata: { responseTime: 1000 }
                },
                'model2': {
                    content: 'Response from model 2',
                    metadata: { responseTime: 1200 }
                }
            };

            const results = scorer.compareResponses(responses);
            
            expect(results).to.have.property('bestResponse');
            expect(results).to.have.property('scores');
            expect(results.scores).to.have.all.keys('model1', 'model2');
        });

        it('should handle empty responses object', () => {
            const results = scorer.compareResponses({});
            
            expect(results.bestResponse).to.be.null;
            expect(results.scores).to.be.empty;
        });
    });

    describe('generateTags', () => {
        it('should generate valid TagSpaces tags', () => {
            const modelName = 'gpt4';
            const score = {
                breakdown: {
                    accuracy: 0.9,
                    consistency: 0.85,
                    performance: 0.95
                }
            };
            const prompt = 'Test prompt';

            const tags = scorer.generateTags(modelName, score, prompt);
            
            expect(tags).to.be.an('array');
            expect(tags).to.have.length(5);
            expect(tags[0]).to.include('#model/');
            expect(tags[1]).to.include('#accuracy/');
            expect(tags[2]).to.include('#consistency/');
        });

        it('should handle empty prompt', () => {
            const modelName = 'gpt4';
            const score = {
                breakdown: {
                    accuracy: 0.9,
                    consistency: 0.85,
                    performance: 0.95
                }
            };

            const tags = scorer.generateTags(modelName, score, '');
            
            expect(tags).to.be.an('array');
            expect(tags).to.have.length(5);
        });
    });

    describe('trackCombination', () => {
        it('should track model combinations', () => {
            const models = ['gpt4', 'claude'];
            const scores = {
                'gpt4': { total: 0.9 },
                'claude': { total: 0.85 }
            };

            const result = scorer.trackCombination(models, scores);
            
            expect(result).to.have.property('tag');
            expect(result).to.have.property('score');
            expect(result).to.have.property('models');
            expect(result.score).to.be.approximately(0.875, 0.001);
        });

        it('should handle single model combination', () => {
            const models = ['gpt4'];
            const scores = {
                'gpt4': { total: 0.9 }
            };

            const result = scorer.trackCombination(models, scores);
            
            expect(result.score).to.equal(0.9);
        });
    });

    describe('exportToTagSpaces', () => {
        it('should export results in correct format', async () => {
            const results = {
                bestResponse: 'gpt4',
                scores: {
                    'gpt4': {
                        total: 0.9,
                        breakdown: {
                            accuracy: 0.9,
                            consistency: 0.85,
                            performance: 0.95
                        }
                    }
                },
                prompt: 'Test prompt'
            };

            try {
                await scorer.exportToTagSpaces(results, './test-output');
                // If no error is thrown, test passes
                expect(true).to.be.true;
            } catch (error) {
                expect.fail('Should not throw error');
            }
        });
    });
});
