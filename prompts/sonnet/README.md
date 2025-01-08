# Sonnet Semantic Analysis

## Input
Place the input file in the `input` directory.

## Prompt Instructions
Analyze the input document for semantic understanding. Focus on:
1. Main topics and themes
2. Entity relationships
3. Contextual understanding
4. Semantic patterns

## Output Format
Return a JSON object with the following structure:
```json
{
    "topics": [
        {
            "topic": "Topic name",
            "frequency": 5,
            "context": "Example sentence containing topic",
            "confidence": 0.92,
            "related_topics": ["Related topic 1", "Related topic 2"]
        }
    ],
    "entities": [
        {
            "name": "Entity name",
            "type": "person|organization|location|date|custom",
            "context": "Surrounding context",
            "confidence": 0.95,
            "attributes": {
                "role": "Optional role",
                "importance": "primary|secondary",
                "frequency": 3
            }
        }
    ],
    "relationships": [
        {
            "from": "Entity or topic name",
            "to": "Entity or topic name",
            "type": "associated|involved|related|parent|child",
            "context": "Text describing relationship",
            "confidence": 0.88,
            "attributes": {
                "strength": "strong|medium|weak",
                "temporal": true|false,
                "frequency": 2
            }
        }
    ],
    "semantic_patterns": [
        {
            "type": "recurring_theme|key_concept|important_relationship",
            "description": "Pattern description",
            "examples": [
                {
                    "text": "Example text",
                    "context": "Surrounding context"
                }
            ],
            "confidence": 0.85,
            "frequency": 3
        }
    ],
    "metadata": {
        "model": "sonnet",
        "version": "1.0",
        "processing_time": 123,
        "confidence_scores": {
            "topic_extraction": 0.92,
            "entity_recognition": 0.90,
            "relationship_analysis": 0.88,
            "pattern_detection": 0.85
        }
    }
}
```

## Example
Input:
```text
Sarah's pediatrician visit went well. Dr. Smith reviewed her vaccination records and scheduled a follow-up appointment. The Community Center will remain the location for all exchanges.
```

Output:
```json
{
    "topics": [
        {
            "topic": "medical_appointment",
            "frequency": 2,
            "context": "Sarah's pediatrician visit went well",
            "confidence": 0.95,
            "related_topics": ["healthcare", "vaccination"]
        },
        {
            "topic": "custody_exchange",
            "frequency": 1,
            "context": "The Community Center will remain the location for all exchanges",
            "confidence": 0.90,
            "related_topics": ["location", "scheduling"]
        }
    ],
    "entities": [
        {
            "name": "Sarah",
            "type": "person",
            "context": "Sarah's pediatrician visit went well",
            "confidence": 0.95,
            "attributes": {
                "role": "child",
                "importance": "primary",
                "frequency": 1
            }
        },
        {
            "name": "Dr. Smith",
            "type": "person",
            "context": "Dr. Smith reviewed her vaccination records",
            "confidence": 0.95,
            "attributes": {
                "role": "pediatrician",
                "importance": "secondary",
                "frequency": 1
            }
        },
        {
            "name": "Community Center",
            "type": "location",
            "context": "The Community Center will remain the location for all exchanges",
            "confidence": 0.92,
            "attributes": {
                "role": "exchange_location",
                "importance": "primary",
                "frequency": 1
            }
        }
    ],
    "relationships": [
        {
            "from": "Sarah",
            "to": "Dr. Smith",
            "type": "medical_provider",
            "context": "Dr. Smith reviewed her vaccination records",
            "confidence": 0.90,
            "attributes": {
                "strength": "strong",
                "temporal": true,
                "frequency": 1
            }
        }
    ],
    "semantic_patterns": [
        {
            "type": "recurring_theme",
            "description": "Medical care coordination",
            "examples": [
                {
                    "text": "pediatrician visit went well",
                    "context": "Sarah's pediatrician visit went well"
                },
                {
                    "text": "scheduled a follow-up appointment",
                    "context": "scheduled a follow-up appointment"
                }
            ],
            "confidence": 0.88,
            "frequency": 2
        }
    ],
    "metadata": {
        "model": "sonnet",
        "version": "1.0",
        "processing_time": 156,
        "confidence_scores": {
            "topic_extraction": 0.92,
            "entity_recognition": 0.95,
            "relationship_analysis": 0.90,
            "pattern_detection": 0.88
        }
    }
}
```

## Notes
- Focus on understanding relationships between entities
- Identify recurring themes and patterns
- Extract both explicit and implicit relationships
- Include confidence scores for all extractions
- Provide context for all identified elements
- Pay special attention to custody-related patterns
- Track frequency of topics and entities
- Note temporal aspects of relationships when present
