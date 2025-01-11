# Content Deduplication and Relevance Scoring

## Conversation Threading

### Primary Keys
1. **Thread ID**: Unique identifier for a conversation thread
```json
{
  "thread_id": "unique-conversation-id",
  "timestamp": "ISO-8601",
  "source": "source-system"
}
```

2. **Message ID**: Unique identifier for each message
```json
{
  "message_id": "unique-message-id",
  "thread_id": "parent-conversation-id",
  "timestamp": "ISO-8601",
  "sequence": number
}
```

## Deduplication Strategy

### 1. Cross-Reference Detection
```javascript
const crossReferenceCheck = {
  // Check for duplicate content
  content_hash: "SHA-256 of normalized content",
  reference_points: [{
    file: "source file",
    position: "location in file",
    context: "surrounding content"
  }],
  // Track relationships
  relationships: {
    duplicates: ["message_ids"],
    references: ["message_ids"],
    context: ["message_ids"]
  }
}
```

### 2. Context Preservation
```javascript
const contextTracking = {
  // Original context
  primary_location: {
    file: "original source",
    position: "original position",
    complete: boolean
  },
  // Reference locations
  references: [{
    file: "referencing file",
    position: "reference position",
    type: "duplicate|quote|mention"
  }]
}
```

## Relevance Scoring

### 1. Content Relevance
```javascript
const relevanceScore = {
  // Content factors
  content_match: 0.0 to 1.0,    // How well content matches
  context_match: 0.0 to 1.0,    // How well context matches
  temporal_relevance: 0.0 to 1.0, // Time-based relevance
  
  // Relationship factors
  thread_relevance: 0.0 to 1.0,  // Relevance to thread
  topic_relevance: 0.0 to 1.0,   // Relevance to topic
  user_relevance: 0.0 to 1.0,    // Relevance to users
  
  // Combined score
  total_score: 0.0 to 1.0        // Weighted combination
}
```

### 2. Scoring Factors
```javascript
const scoringFactors = {
  // Content Analysis
  content: {
    key_terms: ["important terms"],
    topics: ["relevant topics"],
    sentiment: -1.0 to 1.0,
    importance: 0.0 to 1.0
  },
  
  // Context Analysis
  context: {
    thread_position: "position in thread",
    temporal_distance: "time from reference",
    user_involvement: ["involved users"],
    topic_alignment: 0.0 to 1.0
  },
  
  // Relationship Analysis
  relationships: {
    direct_references: ["message_ids"],
    indirect_references: ["message_ids"],
    shared_context: ["message_ids"]
  }
}
```

## Implementation

### 1. During Processing
```javascript
// When processing new content
async function processContent(content) {
  // Generate unique IDs
  const threadId = generateThreadId(content);
  const messageId = generateMessageId(content);
  
  // Check for duplicates
  const duplicates = await findDuplicates(content);
  
  // Calculate relevance
  const relevance = calculateRelevance(content, context);
  
  // Store with metadata
  await storeContent({
    content,
    threadId,
    messageId,
    duplicates,
    relevance
  });
}
```

### 2. During Retrieval
```javascript
// When retrieving content
async function retrieveContent(query) {
  // Find relevant content
  const matches = await findMatches(query);
  
  // Score relevance
  const scoredMatches = matches.map(match => ({
    ...match,
    relevance: calculateRelevance(match, query)
  }));
  
  // Remove duplicates
  const deduplicated = removeDuplicates(scoredMatches);
  
  // Sort by relevance
  return deduplicated.sort((a, b) => b.relevance - a.relevance);
}
```

## Example Usage

### 1. Processing a Conversation
```javascript
// When processing a conversation
const conversation = {
  thread_id: "thread-123",
  messages: [{
    message_id: "msg-1",
    content: "Original message",
    timestamp: "2024-01-09T10:00:00Z"
  }, {
    message_id: "msg-2",
    content: "Duplicate content",
    timestamp: "2024-01-09T10:05:00Z"
  }]
};

// Process and deduplicate
const processed = await processConversation(conversation);
```

### 2. Retrieving Content
```javascript
// When retrieving content
const query = {
  topic: "specific topic",
  timeframe: "last 24 hours",
  relevance_threshold: 0.7
};

// Get relevant, deduplicated content
const results = await retrieveRelevantContent(query);
```

## Best Practices

### 1. Deduplication
- Always check for existing content
- Preserve original context
- Maintain reference links
- Track relationship chains

### 2. Relevance Scoring
- Consider multiple factors
- Weight by importance
- Update scores dynamically
- Preserve context

### 3. Content Management
- Keep original source
- Track all references
- Maintain relationships
- Update metadata

## Quality Metrics

### 1. Deduplication Quality
- Duplicate detection rate
- False positive rate
- Context preservation
- Reference accuracy

### 2. Relevance Quality
- Scoring accuracy
- Context relevance
- User satisfaction
- Query match rate
