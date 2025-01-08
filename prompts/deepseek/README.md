# Deepseek Entity Extraction

## Input
Place the input file in the `input` directory.

## Prompt Instructions
Extract and analyze entities from the input document. Focus on:
1. Named entities (people, places, organizations)
2. Domain-specific entities (custody terms, medical terms)
3. Entity attributes and properties
4. Cross-references and mentions

## Output Format
Return a JSON object with the following structure:
```json
{
    "entities": {
        "people": [
            {
                "name": "Person name",
                "type": "child|parent|professional|other",
                "mentions": [
                    {
                        "text": "Exact text mention",
                        "context": "Surrounding context",
                        "position": 123,
                        "confidence": 0.95
                    }
                ],
                "attributes": {
                    "role": "primary_caregiver|medical_provider|etc",
                    "age_group": "child|adult",
                    "frequency": 3,
                    "importance": "primary|secondary"
                },
                "confidence": 0.92
            }
        ],
        "organizations": [
            {
                "name": "Organization name",
                "type": "medical|educational|legal|other",
                "mentions": [
                    {
                        "text": "Exact text mention",
                        "context": "Surrounding context",
                        "position": 234,
                        "confidence": 0.90
                    }
                ],
                "attributes": {
                    "role": "healthcare_provider|school|etc",
                    "frequency": 2,
                    "importance": "primary|secondary"
                },
                "confidence": 0.88
            }
        ],
        "locations": [
            {
                "name": "Location name",
                "type": "facility|address|city|other",
                "mentions": [
                    {
                        "text": "Exact text mention",
                        "context": "Surrounding context",
                        "position": 345,
                        "confidence": 0.92
                    }
                ],
                "attributes": {
                    "purpose": "exchange|medical|educational",
                    "frequency": 1,
                    "importance": "primary|secondary"
                },
                "confidence": 0.90
            }
        ],
        "dates": [
            {
                "date": "YYYY-MM-DD",
                "type": "appointment|exchange|deadline|other",
                "mentions": [
                    {
                        "text": "Exact text mention",
                        "context": "Surrounding context",
                        "position": 456,
                        "confidence": 0.95
                    }
                ],
                "attributes": {
                    "recurring": true|false,
                    "importance": "primary|secondary",
                    "status": "scheduled|completed|pending"
                },
                "confidence": 0.92
            }
        ],
        "custom": [
            {
                "value": "Custom entity value",
                "type": "custody_term|medical_term|legal_term|other",
                "mentions": [
                    {
                        "text": "Exact text mention",
                        "context": "Surrounding context",
                        "position": 567,
                        "confidence": 0.88
                    }
                ],
                "attributes": {
                    "domain": "custody|medical|legal|other",
                    "frequency": 1,
                    "importance": "primary|secondary"
                },
                "confidence": 0.85
            }
        ]
    },
    "relationships": [
        {
            "from": {
                "entity": "Entity name",
                "type": "entity type"
            },
            "to": {
                "entity": "Entity name",
                "type": "entity type"
            },
            "type": "parent_child|provider_patient|location_event|other",
            "mentions": [
                {
                    "text": "Text describing relationship",
                    "context": "Surrounding context",
                    "position": 678,
                    "confidence": 0.90
                }
            ],
            "attributes": {
                "temporal": true|false,
                "strength": "strong|medium|weak",
                "status": "active|historical|pending"
            },
            "confidence": 0.88
        }
    ],
    "cross_references": [
        {
            "entities": [
                {
                    "name": "Entity name",
                    "type": "entity type",
                    "mention": "Specific mention"
                }
            ],
            "context": "Context showing relationship",
            "type": "same_entity|related_entity|part_whole",
            "confidence": 0.85
        }
    ],
    "metadata": {
        "model": "deepseek",
        "version": "1.0",
        "processing_time": 123,
        "confidence_scores": {
            "entity_extraction": 0.92,
            "relationship_detection": 0.88,
            "cross_reference_analysis": 0.85
        }
    }
}
```

## Example
Input:
```text
Sarah's pediatrician, Dr. Smith at Children's Hospital, reviewed her vaccination records. The Community Center on Main Street will remain the location for all exchanges between Parent1 and Parent2.
```

Output:
```json
{
    "entities": {
        "people": [
            {
                "name": "Sarah",
                "type": "child",
                "mentions": [
                    {
                        "text": "Sarah",
                        "context": "Sarah's pediatrician",
                        "position": 0,
                        "confidence": 0.95
                    }
                ],
                "attributes": {
                    "role": "child",
                    "age_group": "child",
                    "frequency": 1,
                    "importance": "primary"
                },
                "confidence": 0.95
            },
            {
                "name": "Dr. Smith",
                "type": "professional",
                "mentions": [
                    {
                        "text": "Dr. Smith",
                        "context": "pediatrician, Dr. Smith at Children's Hospital",
                        "position": 23,
                        "confidence": 0.95
                    }
                ],
                "attributes": {
                    "role": "medical_provider",
                    "age_group": "adult",
                    "frequency": 1,
                    "importance": "secondary"
                },
                "confidence": 0.95
            }
        ],
        "organizations": [
            {
                "name": "Children's Hospital",
                "type": "medical",
                "mentions": [
                    {
                        "text": "Children's Hospital",
                        "context": "Dr. Smith at Children's Hospital",
                        "position": 45,
                        "confidence": 0.92
                    }
                ],
                "attributes": {
                    "role": "healthcare_provider",
                    "frequency": 1,
                    "importance": "secondary"
                },
                "confidence": 0.92
            }
        ],
        "locations": [
            {
                "name": "Community Center",
                "type": "facility",
                "mentions": [
                    {
                        "text": "Community Center",
                        "context": "The Community Center on Main Street",
                        "position": 89,
                        "confidence": 0.95
                    }
                ],
                "attributes": {
                    "purpose": "exchange",
                    "frequency": 1,
                    "importance": "primary"
                },
                "confidence": 0.95
            },
            {
                "name": "Main Street",
                "type": "address",
                "mentions": [
                    {
                        "text": "Main Street",
                        "context": "Community Center on Main Street",
                        "position": 108,
                        "confidence": 0.90
                    }
                ],
                "attributes": {
                    "purpose": "location_reference",
                    "frequency": 1,
                    "importance": "secondary"
                },
                "confidence": 0.90
            }
        ],
        "custom": [
            {
                "value": "vaccination records",
                "type": "medical_term",
                "mentions": [
                    {
                        "text": "vaccination records",
                        "context": "reviewed her vaccination records",
                        "position": 67,
                        "confidence": 0.92
                    }
                ],
                "attributes": {
                    "domain": "medical",
                    "frequency": 1,
                    "importance": "primary"
                },
                "confidence": 0.92
            }
        ]
    },
    "relationships": [
        {
            "from": {
                "entity": "Dr. Smith",
                "type": "people"
            },
            "to": {
                "entity": "Sarah",
                "type": "people"
            },
            "type": "provider_patient",
            "mentions": [
                {
                    "text": "Sarah's pediatrician, Dr. Smith",
                    "context": "Sarah's pediatrician, Dr. Smith at Children's Hospital",
                    "position": 0,
                    "confidence": 0.92
                }
            ],
            "attributes": {
                "temporal": true,
                "strength": "strong",
                "status": "active"
            },
            "confidence": 0.92
        }
    ],
    "cross_references": [
        {
            "entities": [
                {
                    "name": "Community Center",
                    "type": "locations",
                    "mention": "Community Center"
                },
                {
                    "name": "Main Street",
                    "type": "locations",
                    "mention": "Main Street"
                }
            ],
            "context": "The Community Center on Main Street",
            "type": "part_whole",
            "confidence": 0.88
        }
    ],
    "metadata": {
        "model": "deepseek",
        "version": "1.0",
        "processing_time": 145,
        "confidence_scores": {
            "entity_extraction": 0.94,
            "relationship_detection": 0.90,
            "cross_reference_analysis": 0.88
        }
    }
}
```

## Notes
- Extract all named entities with their mentions
- Include position information for each mention
- Track cross-references between entities
- Identify domain-specific terms and concepts
- Provide detailed attributes for each entity
- Note relationships between entities
- Include confidence scores for all extractions
- Pay special attention to custody-related terms
