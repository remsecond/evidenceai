import {
    processOFWEmail,
    utils
} from '../../src/services/ofw-processing.js';

// Sample OFW email content
const SAMPLE_EMAILS = {
    exchange: `
From: parent1@example.com
To: parent2@example.com
Subject: Custody Exchange Today

We have a custody exchange at 5:30 PM today at the usual location. Please ensure all homework and medications are included.

Thanks,
Parent1
`,
    
    scheduleChange: `
From: parent2@example.com
To: parent1@example.com
Subject: Schedule Change Request

I need to change the pickup time from 3:00 PM to 4:30 PM tomorrow due to a doctor's appointment. Please let me know if this works for you.

Best regards,
Parent2
`,
    
    violation: `
From: parent1@example.com
To: parent2@example.com
Subject: Late for Exchange

You were 45 minutes late for today's exchange. This is the third time this month. Please ensure you're on time for future exchanges.

Parent1
`,

    medical: `
From: parent2@example.com
To: parent1@example.com
Subject: Doctor's Appointment Update

The pediatrician appointment is scheduled for Thursday at 2:00 PM. They will be reviewing the allergy test results. Please provide any recent symptoms you've noticed.

Parent2
`,

    expense: `
From: parent1@example.com
To: parent2@example.com
Subject: School Expenses

Attached is the receipt for school supplies ($125.30). Per our agreement, please reimburse 50% by the end of the week.

Thanks,
Parent1
`
};

describe('OFW Email Processing', () => {
    describe('Email Type Detection', () => {
        test('identifies custody exchange emails', async () => {
            const result = await processOFWEmail(SAMPLE_EMAILS.exchange);
            expect(result.custody.type).toBe('custody_exchange');
        });

        test('identifies schedule change emails', async () => {
            const result = await processOFWEmail(SAMPLE_EMAILS.scheduleChange);
            expect(result.custody.type).toBe('schedule_change');
        });

        test('identifies violation emails', async () => {
            const result = await processOFWEmail(SAMPLE_EMAILS.violation);
            expect(result.custody.type).toBe('violation');
        });
    });

    describe('Event Extraction', () => {
        test('extracts exchange times', () => {
            const events = utils.extractEvents({
                content: SAMPLE_EMAILS.exchange
            });
            
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                type: 'exchange',
                time: '5:30 PM'
            });
        });

        test('extracts schedule changes', () => {
            const changes = utils.extractScheduleChanges({
                content: SAMPLE_EMAILS.scheduleChange
            });
            
            expect(changes).toHaveLength(1);
            expect(changes[0]).toMatchObject({
                original: '3:00 PM',
                new: '4:30 PM'
            });
        });
    });

    describe('Participant Extraction', () => {
        test('identifies parents from email addresses', () => {
            const participants = utils.extractParticipants({
                from: 'parent1@example.com',
                to: 'parent2@example.com',
                content: SAMPLE_EMAILS.exchange
            });
            
            expect(participants).toHaveLength(2);
            expect(participants.map(p => p.name)).toContain('parent1@example.com');
            expect(participants.map(p => p.name)).toContain('parent2@example.com');
        });

        test('extracts mentioned names', () => {
            const participants = utils.extractParticipants({
                content: 'Mother Jane and Father John discussed the schedule.'
            });
            
            expect(participants.some(p => p.name.includes('Jane'))).toBe(true);
            expect(participants.some(p => p.name.includes('John'))).toBe(true);
        });
    });

    describe('Action Item Extraction', () => {
        test('identifies required responses', () => {
            const actionItems = utils.extractActionItems({
                content: 'Please respond by tomorrow regarding the schedule change.'
            });
            
            expect(actionItems).toHaveLength(1);
            expect(actionItems[0].deadline).toBe('tomorrow');
        });

        test('extracts deadlines', () => {
            const actionItems = utils.extractActionItems({
                content: 'Please provide medical records by 5:00 PM Friday.'
            });
            
            expect(actionItems[0].deadline).toBe('5:00 PM');
        });
    });

    describe('Pattern Analysis', () => {
        test('analyzes custody patterns', async () => {
            const custodyInfo = {
                type: 'custody_exchange',
                events: [{
                    type: 'exchange',
                    time: '5:30 PM'
                }],
                schedule_changes: []
            };

            const patterns = await utils.analyzeCustodyPatterns(custodyInfo);
            
            expect(patterns).toHaveProperty('communication');
            expect(patterns).toHaveProperty('schedule');
            expect(patterns).toHaveProperty('compliance');
        });
    });

    describe('Integration Tests', () => {
        test('processes complete exchange email', async () => {
            const result = await processOFWEmail(SAMPLE_EMAILS.exchange);
            
            expect(result).toMatchObject({
                email: expect.any(Object),
                custody: {
                    type: 'custody_exchange',
                    events: expect.any(Array),
                    participants: expect.any(Array)
                },
                patterns: expect.any(Object),
                metadata: expect.any(Object)
            });
        });

        test('processes complete schedule change email', async () => {
            const result = await processOFWEmail(SAMPLE_EMAILS.scheduleChange);
            
            expect(result.custody.schedule_changes).toHaveLength(1);
            expect(result.custody.schedule_changes[0]).toMatchObject({
                original: expect.any(String),
                new: expect.any(String),
                reason: expect.stringContaining('doctor')
            });
        });

        test('processes violation email with context', async () => {
            const result = await processOFWEmail(SAMPLE_EMAILS.violation);
            
            expect(result.custody.type).toBe('violation');
            expect(result.patterns.compliance.adherence).toMatchObject({
                score: expect.any(Number),
                violations: expect.any(Array)
            });
        });
    });

    describe('Error Handling', () => {
        test('handles missing content gracefully', async () => {
            const result = await processOFWEmail('');
            expect(result.custody.type).toBe('general');
            expect(result.custody.events).toHaveLength(0);
        });

        test('handles malformed email gracefully', async () => {
            const result = await processOFWEmail('Invalid email content');
            expect(result).toHaveProperty('custody');
            expect(result).toHaveProperty('patterns');
        });
    });
});
