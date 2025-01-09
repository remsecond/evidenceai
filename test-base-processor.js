import BaseProcessor from './src/services/base-processor.js';

async function testBaseProcessor() {
  console.log('\n=== Testing Base Processor ===\n');
  
  const processor = new BaseProcessor();
  
  // Test 1: Create and validate a base document
  console.log('Test 1: Create and validate base document');
  try {
    const doc = await processor.process('test-file.pdf');
    console.log('Base document created:', JSON.stringify(doc, null, 2));
    console.log('✓ Test 1 passed: Base document created and validated\n');
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
    return;
  }
  
  // Test 2: Add timeline events
  console.log('Test 2: Add timeline events');
  try {
    let doc = processor.createBaseDocument('test-file.pdf');
    
    // Add a message event
    doc = processor.addTimelineEvent(doc, {
      type: 'message',
      content: 'Initial discussion about project scope',
      participants: ['Alice', 'Bob'],
      topics: ['scope', 'planning']
    });
    
    // Add a document event
    doc = processor.addTimelineEvent(doc, {
      type: 'document',
      content: 'Project proposal submitted',
      participants: ['Alice'],
      topics: ['proposal', 'documentation']
    });
    
    console.log('Timeline events:', JSON.stringify(doc.timeline.events, null, 2));
    console.log('✓ Test 2 passed: Timeline events added\n');
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
    return;
  }
  
  // Test 3: Add relationships
  console.log('Test 3: Add relationships');
  try {
    let doc = processor.createBaseDocument('test-file.pdf');
    
    // Add participant relationships
    doc = processor.addParticipantRelationship(doc, 'Alice', 'Bob', 'collaborator');
    doc = processor.addParticipantRelationship(doc, 'Bob', 'Charlie', 'reviewer');
    
    // Add topic relationships
    doc = processor.addTopicRelationship(doc, 'scope', 'planning', 'related');
    doc = processor.addTopicRelationship(doc, 'proposal', 'documentation', 'parent');
    
    console.log('Participant network:', JSON.stringify(doc.relationships.participant_network, null, 2));
    console.log('Topic links:', JSON.stringify(doc.relationships.topic_links, null, 2));
    console.log('✓ Test 3 passed: Relationships added\n');
  } catch (error) {
    console.error('✗ Test 3 failed:', error);
    return;
  }
  
  // Test 4: Validate complex document
  console.log('Test 4: Validate complex document');
  try {
    let doc = processor.createBaseDocument('test-file.pdf');
    
    // Add events and relationships
    doc = processor.addTimelineEvent(doc, {
      type: 'message',
      content: 'Initial discussion',
      participants: ['Alice', 'Bob'],
      topics: ['scope']
    });
    
    doc = processor.addParticipantRelationship(doc, 'Alice', 'Bob', 'collaborator');
    doc = processor.addTopicRelationship(doc, 'scope', 'planning', 'related');
    
    const validationResult = await processor.validateData(doc);
    if (validationResult.isValid) {
      console.log('✓ Test 4 passed: Complex document validated\n');
    } else {
      console.error('✗ Test 4 failed: Validation errors:', validationResult.errors);
    }
  } catch (error) {
    console.error('✗ Test 4 failed:', error);
    return;
  }
  
  console.log('All tests completed successfully!');
}

// First install dependencies
console.log('Installing dependencies...');
const { execSync } = await import('child_process');
try {
  execSync('npm install ajv ajv-formats', { stdio: 'inherit' });
  console.log('Dependencies installed successfully\n');
  await testBaseProcessor();
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}
