import { jest } from '@jest/globals';
import { setupLogging, getLogger } from '../../src/utils/logging.js';
import { setupStorage, createFolder, uploadFile } from '../../src/services/storage.js';
import { analyzeSemantic, analyzeTimeline, extractDeepEntities, analyzeComplex } from '../../src/services/ai.js';

// Mock environment variables
process.env.SONNET_ENABLED = 'true';
process.env.SONNET_API_KEY = 'test-sonnet-key';
process.env.NOTEBOOKLM_ENABLED = 'false';
process.env.DEEPSEEK_ENABLED = 'false';
process.env.GPT4_ENABLED = 'false';

// Mock MCP tools
jest.mock('../../src/utils/mcp.js', () => ({
    use_mcp_tool: jest.fn().mockImplementation(async ({ server_name, tool_name, arguments: args }) => {
        if (server_name === 'sequential-thinking' && tool_name === 'validate_analysis') {
            return {
                valid_topics: args.analysis.topics.map(t => t.topic),
                valid_entities: args.analysis.entities.map(e => e.name),
                valid_relationships: args.analysis.relationships,
                valid_patterns: args.analysis.semantic_patterns.map(p => p.type),
                confidence_scores: {
                    topics: 0.95,
                    entities: 0.92,
                    relationships: 0.88,
                    patterns: 0.85
                }
            };
        }
        if (server_name === 'chatsum' && tool_name === 'analyze') {
            return {
                summary: "Sarah had a successful pediatrician visit with Dr. Smith who reviewed vaccinations and scheduled follow-up.",
                key_points: [
                    "Medical appointment with pediatrician",
                    "Vaccination record review",
                    "Follow-up scheduling"
                ],
                initial_patterns: [
                    {
                        type: "healthcare_interaction",
                        description: "Regular pediatric care visit pattern"
                    }
                ]
            };
        }
        if (server_name === 'deepseek' && tool_name === 'extract_entities') {
            return {
                entities: {
                    people: [
                        {
                            name: "Sarah",
                            type: "child",
                            mentions: [
                                {
                                    text: "Sarah",
                                    context: "Sarah's pediatrician visit went well",
                                    position: 0,
                                    confidence: 0.95
                                }
                            ],
                            attributes: {
                                role: "child",
                                age_group: "child",
                                frequency: 1,
                                importance: "primary"
                            },
                            confidence: 0.95
                        }
                    ],
                    organizations: [
                        {
                            name: "Children's Hospital",
                            type: "medical",
                            mentions: [
                                {
                                    text: "Children's Hospital",
                                    context: "Dr. Smith at Children's Hospital",
                                    position: 45,
                                    confidence: 0.92
                                }
                            ],
                            attributes: {
                                role: "healthcare_provider",
                                frequency: 1,
                                importance: "secondary"
                            },
                            confidence: 0.92
                        }
                    ]
                },
                relationships: [
                    {
                        from: {
                            entity: "Sarah",
                            type: "people"
                        },
                        to: {
                            entity: "Children's Hospital",
                            type: "organizations"
                        },
                        type: "receives_care",
                        mentions: [
                            {
                                text: "Sarah's pediatrician visit",
                                context: "Sarah's pediatrician visit went well",
                                position: 0,
                                confidence: 0.90
                            }
                        ],
                        attributes: {
                            temporal: true,
                            strength: "strong",
                            status: "active"
                        },
                        confidence: 0.90
                    }
                ],
                cross_references: [
                    {
                        entities: [
                            {
                                name: "Sarah",
                                type: "people",
                                mention: "Sarah"
                            }
                        ],
                        context: "Sarah's pediatrician visit went well",
                        type: "same_entity",
                        confidence: 0.95
                    }
                ],
                metadata: {
                    model: "deepseek",
                    version: "1.0",
                    confidence_scores: {
                        entity_extraction: 0.94,
                        relationship_detection: 0.90,
                        cross_reference_analysis: 0.92
                    }
                }
            };
        }
        throw new Error(`Unknown MCP tool: ${server_name}/${tool_name}`);
    }),
    access_mcp_resource: jest.fn()
}));

// Mock Sonnet SDK
jest.mock('@sonnet/sdk', () => ({
    Sonnet: jest.fn().mockImplementation(() => ({
        analyze: jest.fn().mockResolvedValue({
            topics: [
                {
                    topic: "medical_appointment",
                    frequency: 2,
                    context: "Sarah's pediatrician visit went well",
                    confidence: 0.95,
                    related_topics: ["healthcare", "vaccination"]
                }
            ],
            entities: [
                {
                    name: "Sarah",
                    type: "person",
                    context: "Sarah's pediatrician visit went well",
                    confidence: 0.95,
                    attributes: {
                        role: "child",
                        importance: "primary",
                        frequency: 1
                    }
                }
            ],
            relationships: [
                {
                    from: "Sarah",
                    to: "Dr. Smith",
                    type: "medical_provider",
                    context: "Dr. Smith reviewed her vaccination records",
                    confidence: 0.90,
                    attributes: {
                        strength: "strong",
                        temporal: true,
                        frequency: 1
                    }
                }
            ],
            semantic_patterns: [
                {
                    type: "recurring_theme",
                    description: "Medical care coordination",
                    examples: [
                        {
                            text: "pediatrician visit went well",
                            context: "Sarah's pediatrician visit went well"
                        }
                    ],
                    confidence: 0.88,
                    frequency: 2
                }
            ],
            metadata: {
                model: "sonnet",
                version: "1.0",
                processing_time: 156,
                confidence_scores: {
                    topic_extraction: 0.92,
                    entity_recognition: 0.95,
                    relationship_analysis: 0.90,
                    pattern_detection: 0.88
                }
            }
        })
    }))
}));

describe('Logging Service', () => {
    test('setupLogging initializes logger', () => {
        const logger = setupLogging();
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
    });

    test('getLogger returns initialized logger', () => {
        const logger = getLogger();
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
    });
});

describe('Storage Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('setupStorage initializes Google Drive client', async () => {
        await expect(setupStorage()).resolves.not.toThrow();
    });

    test('createFolder creates a new folder', async () => {
        await setupStorage();
        const folder = await createFolder('Test Folder');
        expect(folder).toBeDefined();
        expect(folder.id).toBe('test-file-id');
    });

    test('uploadFile uploads a file to Drive', async () => {
        await setupStorage();
        const fileBuffer = Buffer.from('test content');
        const result = await uploadFile(fileBuffer, 'test.txt', 'text/plain');
        expect(result).toBeDefined();
        expect(result.id).toBe('test-file-id');
    });
});

describe('AI Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Semantic Analysis', () => {
        const sampleContent = "Sarah's pediatrician visit went well. Dr. Smith reviewed her vaccination records and scheduled a follow-up appointment.";

        test('analyzeSemantic returns properly structured result', async () => {
            const result = await analyzeSemantic(sampleContent);
            
            // Verify structure matches Sonnet README format
            expect(result).toHaveProperty('topics');
            expect(result).toHaveProperty('entities');
            expect(result).toHaveProperty('relationships');
            expect(result).toHaveProperty('semantic_patterns');
            expect(result).toHaveProperty('metadata');

            // Verify topics
            expect(result.topics[0]).toHaveProperty('topic');
            expect(result.topics[0]).toHaveProperty('frequency');
            expect(result.topics[0]).toHaveProperty('context');
            expect(result.topics[0]).toHaveProperty('confidence');
            expect(result.topics[0]).toHaveProperty('related_topics');

            // Verify entities
            expect(result.entities[0]).toHaveProperty('name');
            expect(result.entities[0]).toHaveProperty('type');
            expect(result.entities[0]).toHaveProperty('context');
            expect(result.entities[0]).toHaveProperty('confidence');
            expect(result.entities[0]).toHaveProperty('attributes');

            // Verify relationships
            expect(result.relationships[0]).toHaveProperty('from');
            expect(result.relationships[0]).toHaveProperty('to');
            expect(result.relationships[0]).toHaveProperty('type');
            expect(result.relationships[0]).toHaveProperty('context');
            expect(result.relationships[0]).toHaveProperty('confidence');
            expect(result.relationships[0]).toHaveProperty('attributes');

            // Verify semantic patterns
            expect(result.semantic_patterns[0]).toHaveProperty('type');
            expect(result.semantic_patterns[0]).toHaveProperty('description');
            expect(result.semantic_patterns[0]).toHaveProperty('examples');
            expect(result.semantic_patterns[0]).toHaveProperty('confidence');
            expect(result.semantic_patterns[0]).toHaveProperty('frequency');

            // Verify metadata
            expect(result.metadata).toHaveProperty('model', 'sonnet');
            expect(result.metadata).toHaveProperty('version');
            expect(result.metadata).toHaveProperty('processing_time');
            expect(result.metadata).toHaveProperty('confidence_scores');
        });

        test('analyzeSemantic handles large content with chunking', async () => {
            const largeContent = sampleContent.repeat(1000); // Create large content
            const result = await analyzeSemantic(largeContent);
            
            expect(result).toHaveProperty('topics');
            expect(result).toHaveProperty('entities');
            expect(result.metadata.model).toBe('sonnet');
        });

        test('analyzeSemantic handles errors gracefully', async () => {
            // Mock Sonnet client to throw error
            const Sonnet = require('@sonnet/sdk').Sonnet;
            Sonnet.mockImplementationOnce(() => ({
                analyze: jest.fn().mockRejectedValue(new Error('API Error'))
            }));

            await expect(analyzeSemantic(sampleContent))
                .rejects
                .toThrow('API Error');
        });

        test('analyzeSemantic gets quick insights from Chatsum', async () => {
            const result = await analyzeSemantic(sampleContent);
            
            // Verify Chatsum was called for quick insights
            const { use_mcp_tool } = require('../../src/utils/mcp.js');
            expect(use_mcp_tool).toHaveBeenCalledWith({
                server_name: 'chatsum',
                tool_name: 'analyze',
                arguments: expect.objectContaining({
                    text: sampleContent,
                    analysis_type: 'quick_insights',
                    include: expect.arrayContaining([
                        'key_points',
                        'summary',
                        'initial_patterns'
                    ])
                })
            });

            // Verify quick insights are included in result
            expect(result.metadata.quick_insights).toBeDefined();
            expect(result.metadata.quick_insights.summary).toBeDefined();
            expect(result.metadata.quick_insights.key_points).toHaveLength(3);
            expect(result.metadata.quick_insights.initial_patterns).toHaveLength(1);
        });

        test('analyzeSemantic uses quick insights to guide Sonnet analysis', async () => {
            const result = await analyzeSemantic(sampleContent);
            
            // Verify Sonnet was called with quick insights context
            const Sonnet = require('@sonnet/sdk').Sonnet;
            const analyzeMock = Sonnet.mock.results[0].value.analyze;
            
            expect(analyzeMock).toHaveBeenCalledWith(expect.objectContaining({
                context: expect.objectContaining({
                    key_points: expect.arrayContaining([
                        "Medical appointment with pediatrician",
                        "Vaccination record review",
                        "Follow-up scheduling"
                    ]),
                    initial_patterns: expect.arrayContaining([
                        expect.objectContaining({
                            type: "healthcare_interaction"
                        })
                    ])
                })
            }));
        });

        test('analyzeSemantic validates results with Sequential-thinking', async () => {
            const result = await analyzeSemantic(sampleContent);
            
            // Verify Sequential-thinking validation was called
            const { use_mcp_tool } = require('../../src/utils/mcp.js');
            const validationCall = use_mcp_tool.mock.calls.find(
                call => call[0].server_name === 'sequential-thinking'
            );
            
            expect(validationCall[0]).toEqual(expect.objectContaining({
                server_name: 'sequential-thinking',
                tool_name: 'validate_analysis',
                arguments: expect.objectContaining({
                    text: expect.any(String),
                    validation_type: 'semantic',
                    aspects: expect.arrayContaining([
                        'topic_coherence',
                        'entity_relationships',
                        'pattern_logic'
                    ])
                })
            }));

            // Verify validation results were applied
            expect(result.metadata.confidence_scores.topic_extraction).toBe(0.95);
            expect(result.metadata.confidence_scores.entity_recognition).toBe(0.92);
            expect(result.metadata.confidence_scores.relationship_analysis).toBe(0.88);
            expect(result.metadata.confidence_scores.pattern_detection).toBe(0.85);
        });

        test('analyzeSemantic handles Chatsum errors gracefully', async () => {
            // Mock Chatsum to throw error
            const { use_mcp_tool } = require('../../src/utils/mcp.js');
            use_mcp_tool.mockImplementationOnce(async ({ server_name }) => {
                if (server_name === 'chatsum') {
                    throw new Error('Chatsum Error');
                }
                return {}; // Return empty for other calls
            });

            await expect(analyzeSemantic(sampleContent))
                .rejects
                .toThrow('Chatsum Error');
        });

        test('analyzeSemantic handles Sequential-thinking validation errors', async () => {
            // Mock Sequential-thinking to throw error
            const { use_mcp_tool } = require('../../src/utils/mcp.js');
            use_mcp_tool.mockImplementationOnce(async ({ server_name }) => {
                if (server_name === 'sequential-thinking') {
                    throw new Error('Validation Error');
                }
                return {}; // Return empty for other calls
            });

            await expect(analyzeSemantic(sampleContent))
                .rejects
                .toThrow('Validation Error');
        });

        test('analyzeSemantic fails when Sonnet is not configured', async () => {
            // Temporarily disable Sonnet
            const originalEnabled = process.env.SONNET_ENABLED;
            process.env.SONNET_ENABLED = 'false';

            await expect(analyzeSemantic(sampleContent))
                .rejects
                .toThrow('Sonnet client not configured');

            // Restore original config
            process.env.SONNET_ENABLED = originalEnabled;
        });
    });
});

describe('Entity Extraction', () => {
    const sampleContent = "Sarah's pediatrician visit went well. Dr. Smith reviewed her vaccination records and scheduled a follow-up appointment.";

    test('extractDeepEntities returns properly structured result', async () => {
        const result = await extractDeepEntities(sampleContent);
        
        // Verify structure matches Deepseek README format
        expect(result).toHaveProperty('entities');
        expect(result).toHaveProperty('relationships');
        expect(result).toHaveProperty('cross_references');
        expect(result).toHaveProperty('metadata');

        // Verify entities
        expect(result.entities).toHaveProperty('people');
        expect(result.entities).toHaveProperty('organizations');
        expect(result.entities.people[0]).toHaveProperty('name');
        expect(result.entities.people[0]).toHaveProperty('type');
        expect(result.entities.people[0]).toHaveProperty('mentions');
        expect(result.entities.people[0]).toHaveProperty('attributes');
        expect(result.entities.people[0]).toHaveProperty('confidence');

        // Verify mentions
        const mention = result.entities.people[0].mentions[0];
        expect(mention).toHaveProperty('text');
        expect(mention).toHaveProperty('context');
        expect(mention).toHaveProperty('position');
        expect(mention).toHaveProperty('confidence');

