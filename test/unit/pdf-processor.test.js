import pdfProcessor from './src/services/pdf-processor.js';
import { getLogger } from './src/utils/logging.js';

const logger = getLogger();

async function testPDFProcessor() {
    console.log('\n=== Testing PDF Processor ===\n');
    
    // Test 1: Process multiple test PDF files
    console.log('Test 1: Process multiple test PDF files');
    try {
        const files = [
            'C:/Users/robmo/OneDrive/Documents/evidenceai_test/input/By Month/1 Jan/1 23 Jan Emails Smaller.pdf',
            'C:/Users/robmo/OneDrive/Documents/evidenceai_test/input/By Month/1 Jan/1 23 Jan Emails Smaller.pdf' // Using same file twice for testing
        ];
        
        const options = {
            taskObjective: "Analyze email communications for legal and financial matters",
            sampleQueries: [
                "Find all financial disputes between parties",
                "Create timeline of legal communications",
                "Identify recurring topics across documents"
            ],
            domainTerminology: {
                "OFW": "Our Family Wizard",
                "PP": "Parenting Plan",
                "GAL": "Guardian Ad Litem"
            }
        };
        
        const doc = await pdfProcessor.processPdf(files, options);
        
        // Log document overview
        console.log('\nDocument Overview:');
        console.log('-----------------');
        console.log('Thread ID:', doc.thread_id);
        console.log('Timeline Events:', doc.timeline.events.length);
        console.log('Validation Status:', doc.metadata.validation_status);
        
        // Log task metadata
        console.log('\nTask Information:');
        console.log('----------------');
        console.log('Objective:', doc.metadata.task.objective);
        console.log('Sample Queries:', doc.metadata.task.sample_queries);
        console.log('Domain Terms:', doc.metadata.task.domain_terminology);
        
        // Log PDF-specific metadata
        console.log('\nPDF Metadata:');
        console.log('-------------');
        doc.metadata.pdf_info.forEach((pdf, index) => {
            console.log(`\nDocument ${index + 1}:`);
            console.log('Path:', pdf.path);
            console.log('Pages:', pdf.pages);
            console.log('Version:', pdf.version);
        });
        console.log('\nProcessing Time:', doc.metadata.processing_meta.processing_time_ms + 'ms');
        console.log('Files Processed:', doc.metadata.processing_meta.files_processed);
        
        // Log combined statistics
        console.log('\nCombined Statistics:');
        console.log('-------------------');
        console.log('Total Words:', doc.metadata.statistics.totals.words.toLocaleString());
        console.log('Total Paragraphs:', doc.metadata.statistics.totals.paragraphs);
        console.log('Total Tokens:', doc.metadata.statistics.totals.estimated_total_tokens.toLocaleString());
        console.log('Documents Processed:', doc.metadata.statistics.totals.documents_processed);
        
        // Log sample events
        console.log('\nSample Timeline Events:');
        console.log('----------------------');
        doc.timeline.events.slice(0, 3).forEach((event, index) => {
            console.log(`\nEvent ${index + 1}:`);
            console.log('Type:', event.type);
            console.log('Source:', event.source_file || 'Not specified');
            console.log('Participants:', event.participants.join(', ') || 'None');
            console.log('Topics:', event.topics.join(', ') || 'None');
            if (event.key_points) {
                console.log('Key Points:', event.key_points.map(p => `[${p.type}] ${p.content}`).join('\n  '));
            }
            console.log('Content Preview:', event.content.substring(0, 100) + '...');
        });
        
        // Log cross-references
        console.log('\nCross-Reference Summary:');
        console.log('----------------------');
        const crossRefs = doc.metadata.cross_references;
        console.log('Shared Participants:', crossRefs.participant_overlaps.length);
        console.log('Shared Topics:', crossRefs.topic_overlaps.length);
        console.log('Date Overlaps:', crossRefs.date_overlaps.length);
        console.log('Key Point Overlaps:', crossRefs.key_point_overlaps.length);
        
        // Log relationship summary
        console.log('\nRelationship Summary:');
        console.log('--------------------');
        const participantCount = Object.keys(doc.relationships.participant_network).length;
        const topicCount = Object.keys(doc.relationships.topic_links).length;
        console.log('Participant Relationships:', participantCount);
        console.log('Topic Links:', topicCount);
        
        // Sample participant relationships
        if (participantCount > 0) {
            console.log('\nSample Participant Relationships:');
            const participants = Object.keys(doc.relationships.participant_network);
            const sampleParticipant = participants[0];
            console.log(`Relationships for ${sampleParticipant}:`, 
                doc.relationships.participant_network[sampleParticipant]);
        }
        
        console.log('\n✓ Test 1 passed: PDF processed successfully\n');
        
    } catch (error) {
        console.error('✗ Test 1 failed:', error);
        return;
    }
}

// First install dependencies
console.log('Installing dependencies...');
const { execSync } = await import('child_process');
try {
    execSync('npm install pdf-parse ajv ajv-formats', { stdio: 'inherit' });
    console.log('Dependencies installed successfully\n');
    await testPDFProcessor();
} catch (error) {
    console.error('Error installing dependencies:', error);
    process.exit(1);
}
