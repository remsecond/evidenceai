module.exports = {
    rules: {
        'require-chunking': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Enforce use of chunking for LLM operations',
                    category: 'Best Practices',
                    recommended: true
                },
                schema: []
            },
            create(context) {
                return {
                    // Detect direct MCP tool usage
                    CallExpression(node) {
                        if (node.callee.name === 'use_mcp_tool') {
                            const args = node.arguments[0];
                            if (args && args.properties) {
                                const toolName = args.properties.find(p => 
                                    p.key.name === 'tool_name' &&
                                    ['analyze', 'summarize', 'generate'].includes(p.value.value)
                                );
                                
                                if (toolName) {
                                    context.report({
                                        node,
                                        message: 'Direct MCP tool usage detected. Use ai.js service instead.'
                                    });
                                }
                            }
                        }
                    },

                    // Ensure chunking metadata is included
                    ReturnStatement(node) {
                        if (node.argument && node.argument.type === 'ObjectExpression') {
                            const hasMetadata = node.argument.properties.some(p => 
                                p.key.name === 'metadata'
                            );
                            
                            const hasChunking = node.argument.properties.some(p =>
                                p.key.name === 'metadata' &&
                                p.value.properties.some(mp => mp.key.name === 'chunking')
                            );

                            if (hasMetadata && !hasChunking) {
                                context.report({
                                    node,
                                    message: 'Missing chunking metadata in return object'
                                });
                            }
                        }
                    },

                    // Check for proper chunk size limits
                    VariableDeclarator(node) {
                        if (node.id.name === 'MAX_CHUNK_SIZE') {
                            const value = node.init.value;
                            if (value > 150000) {
                                context.report({
                                    node,
                                    message: 'MAX_CHUNK_SIZE exceeds recommended limit of 150,000 tokens'
                                });
                            }
                        }
                    }
                };
            }
        },

        'require-chunking-tests': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Enforce chunking tests for services',
                    category: 'Testing',
                    recommended: true
                },
                schema: []
            },
            create(context) {
                const filename = context.getFilename();
                
                // Only apply to service files
                if (!filename.includes('/services/')) {
                    return {};
                }

                return {
                    Program(node) {
                        const testFile = filename.replace(
                            '/services/',
                            '/tests/unit/'
                        ).replace('.js', '.test.js');

                        try {
                            require(testFile);
                        } catch (error) {
                            context.report({
                                node,
                                message: `Missing test file: ${testFile}`
                            });
                        }
                    }
                };
            }
        },

        'validate-chunking-metadata': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Validate chunking metadata structure',
                    category: 'Best Practices',
                    recommended: true
                },
                schema: []
            },
            create(context) {
                return {
                    ObjectExpression(node) {
                        const isMetadata = node.properties.some(p => 
                            p.key.name === 'metadata'
                        );

                        if (isMetadata) {
                            const chunking = node.properties.find(p =>
                                p.key.name === 'metadata'
                            )?.value.properties.find(p =>
                                p.key.name === 'chunking'
                            );

                            if (chunking) {
                                const requiredFields = [
                                    'enabled',
                                    'chunk_count',
                                    'total_tokens',
                                    'avg_chunk_size'
                                ];

                                const missingFields = requiredFields.filter(field =>
                                    !chunking.value.properties.some(p =>
                                        p.key.name === field
                                    )
                                );

                                if (missingFields.length > 0) {
                                    context.report({
                                        node,
                                        message: `Missing required chunking metadata fields: ${missingFields.join(', ')}`
                                    });
                                }
                            }
                        }
                    }
                };
            }
        }
    },
    configs: {
        recommended: {
            plugins: ['chunking'],
            rules: {
                'chunking/require-chunking': 'error',
                'chunking/require-chunking-tests': 'error',
                'chunking/validate-chunking-metadata': 'error'
            }
        }
    }
};
