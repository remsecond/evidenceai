import DocumentEntity from '../simple-pdf-processor/src/models/document-entity.js';
import timelineProcessor from '../simple-pdf-processor/src/services/timeline-processor.js';
import googleSheets from '../src/services/google-sheets.js';
import attachmentService from '../src/mcp/attachment-server/attachment-service.js';
import path from 'path';
import fs from 'fs/promises';

async function createTestDocuments() {
    // Create test directory
    const testDir = 'test-data/timeline-test';
    await fs.mkdir(testDir, { recursive: true });

    // Create test files
    const files = {
        email1: {
            path: path.join(testDir, 'email1.txt'),
            originalname: 'email1.txt',
            content: `
From: john@example.com
To: mary@example.com
Date: 2024-01-15
Subject: Project Proposal

Please find attached the project proposal and budget spreadsheet.
Let me know your thoughts.
            `.trim()
        },
        email2: {
            path: path.join(testDir, 'email2.txt'),
            originalname: 'email2.txt',
            content: `
From: mary@example.com
To: john@example.com
Date: 2024-01-16
Subject: Re: Project Proposal

I've reviewed the proposal. The budget looks good but I've made some notes
in the attached spreadsheet.
            `.trim()
        },
        email3: {
            path: path.join(testDir, 'email3.txt'),
            originalname: 'email3.txt',
            content: `
From: john@example.com
To: team@example.com
Date: 2024-01-17
Subject: Updated Project Proposal

Based on Mary's feedback, I've updated the proposal. The revised version
and final budget are attached.
            `.trim()
        },
        proposal: {
            path: path.join(testDir, 'project_proposal.pdf'),
            originalname: 'project_proposal.pdf',
            content: `
Project Proposal
Version: 1.0
Date: 2024-01-15

Executive Summary...
            `.trim()
        },
        proposalV2: {
            path: path.join(testDir, 'project_proposal_v2.pdf'),
            originalname: 'project_proposal_v2.pdf',
            content: `
Project Proposal
Version: 2.0
Date: 2024-01-17

Executive Summary...
[Incorporating feedback from review]
            `.trim()
        },
        budget: {
            path: path.join(testDir, 'budget.xlsx'),
            originalname: 'budget.xlsx',
            content: `
Project Budget
Version: 1.0
Last Modified: 2024-01-15

Q1 Expenses...
            `.trim()
        },
        budgetWithNotes: {
            path: path.join(testDir, 'budget_with_notes.xlsx'),
            originalname: 'budget_with_notes.xlsx',
            content: `
Project Budget
Version: 1.1
Last Modified: 2024-01-16

Q1 Expenses...
[Mary's notes added]
            `.trim()
        }
    };

    // Write test files
    for (const [name, file] of Object.entries(files)) {
        await fs.writeFile(file.path, file.content);
    }

    // Create document entities
    const docs = {
        email1: new DocumentEntity(files.email1),
        email2: new DocumentEntity(files.email2),
        email3: new DocumentEntity(files.email3),
        proposal: new DocumentEntity(files.proposal),
        proposalV2: new DocumentEntity(files.proposalV2),
        budget: new DocumentEntity(files.budget),
        budgetWithNotes: new DocumentEntity(files.budgetWithNotes)
    };

    // Set classifications
    docs.email1.updateClassification({ type: 'email', context: 'communication' });
    docs.email2.updateClassification({ type: 'email', context: 'communication' });
    docs.email3.updateClassification({ type: 'email', context: 'communication' });
    docs.proposal.updateClassification({ type: 'document', context: 'proposal' });
    docs.proposalV2.updateClassification({ type: 'document', context: 'proposal' });
    docs.budget.updateClassification({ type: 'spreadsheet', context: 'financial' });
    docs.budgetWithNotes.updateClassification({ type: 'spreadsheet', context: 'financial' });

    return docs;
}

async function processTimelineScenario() {
    try {
        console.log('Creating test documents...');
        const docs = await createTestDocuments();

        // Process documents in chronological sets
        console.log('\nProcessing initial proposal...');
        const set1 = await timelineProcessor.processDocumentSet([
            docs.email1,
            docs.proposal,
            docs.budget
        ]);

        console.log('\nProcessing feedback...');
        const set2 = await timelineProcessor.processDocumentSet([
            docs.email2,
            docs.budgetWithNotes
        ]);

        console.log('\nProcessing final version...');
        const set3 = await timelineProcessor.processDocumentSet([
            docs.email3,
            docs.proposalV2
        ]);

        // Combine all events
        const allEvents = [...set1, ...set2, ...set3];

        // Create timeline in Google Sheets
        console.log('\nCreating timeline visualization...');
        const sheetId = await googleSheets.createTimelineSheet('Project Proposal Timeline');
        await googleSheets.addTimelineEvents(allEvents);

        // Add attachment tracking sheet
        console.log('\nTracking attachments...');
        await googleSheets.addAttachmentSheet(sheetId);

        // Initialize attachment service
        await attachmentService.init();

        // Get storage stats
        const stats = await attachmentService.getStorageStats();
        console.log('\nStorage Statistics:');
        console.log(JSON.stringify(stats.data, null, 2));

        // Find duplicates
        const dupes = await attachmentService.findDuplicates(2);
        console.log('\nDuplicate Attachments:');
        console.log(JSON.stringify(dupes.data, null, 2));

        console.log('\nTimeline scenario complete!');
        return { sheetId, events: allEvents };
    } catch (error) {
        console.error('Error processing timeline scenario:', error);
        throw error;
    }
}

// Run the scenario
processTimelineScenario().catch(console.error);
