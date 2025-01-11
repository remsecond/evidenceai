import { parseEmailThread, extractDates } from '../../src/services/email-processing.js';

describe('Email Processing', () => {
    const sampleEmail = `From: sender@example.com
To: recipient@example.com
Subject: Project Timeline Update
Date: Mon, 15 Jan 2024 10:00:00 -0500

Hi Team,

Here's an update on our recent project milestones:

1. Initial planning phase completed on January 10th
2. Team assignments finalized on January 12th
3. Development environment setup scheduled for January 17th

Best regards,
John

-------------------
From: recipient@example.com
To: sender@example.com
Subject: Re: Project Timeline Update
Date: Mon, 15 Jan 2024 10:30:00 -0500

Thanks John,

Looking forward to starting the development phase.

Best,
Sarah`;

    describe('parseEmailThread', () => {
        test('correctly splits and parses email thread', () => {
            const result = parseEmailThread(sampleEmail);
            
            expect(result).toMatchObject({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        from: 'sender@example.com',
                        to: 'recipient@example.com',
                        subject: 'Project Timeline Update'
                    }),
                    expect.objectContaining({
                        from: 'recipient@example.com',
                        to: 'sender@example.com',
                        subject: 'Re: Project Timeline Update'
                    })
                ]),
                subject: 'Project Timeline Update',
                participants: expect.arrayContaining([
                    expect.objectContaining({
                        email: 'sender@example.com',
                        name: expect.any(String),
                        role: 'initiator'
                    }),
                    expect.objectContaining({
                        email: 'recipient@example.com',
                        name: expect.any(String),
                        role: 'responder'
                    })
                ])
            });
        });

        test('extracts correct message count', () => {
            const result = parseEmailThread(sampleEmail);
            expect(result.messages).toHaveLength(2);
        });

        test('maintains chronological order', () => {
            const result = parseEmailThread(sampleEmail);
            const timestamps = result.messages.map(m => new Date(m.timestamp).getTime());
            expect(timestamps).toEqual([...timestamps].sort());
        });

        test('handles malformed email gracefully', () => {
            const malformedEmail = 'Not a proper email format';
            expect(() => parseEmailThread(malformedEmail)).not.toThrow();
        });
    });

    describe('extractDates', () => {
        test('extracts dates in various formats', () => {
            const content = `
                Meeting on 2024-01-25
                Conference on January 15th, 2024
                Review on Jan 20, 2024
            `;
            
            const dates = extractDates(content);
            
            expect(dates).toHaveLength(3);
            const expectedDates = new Set(['2024-01-25', '2024-01-15', '2024-01-20']);
            const extractedDates = new Set(dates.map(d => d.date));
            expect(extractedDates).toEqual(expectedDates);
        });

        test('includes context with extracted dates', () => {
            const content = 'The meeting is scheduled for January 25th, 2024 in the main office.';
            const dates = extractDates(content);
            
            expect(dates[0]).toMatchObject({
                date: '2024-01-25',
                context: expect.stringContaining('meeting is scheduled for'),
                original: 'January 25th, 2024'
            });
        });

        test('handles no dates gracefully', () => {
            const content = 'No dates mentioned in this text.';
            const dates = extractDates(content);
            expect(dates).toHaveLength(0);
        });

        test('extracts dates from sample email', () => {
            const dates = extractDates(sampleEmail);
            
            const expectedDates = new Set([
                '2024-01-10', // Initial planning
                '2024-01-12', // Team assignments
                '2024-01-17', // Development setup
                '2024-01-15'  // Email dates (both original and reply)
            ]);
            
            const extractedDates = new Set(dates.map(d => d.date));
            expect(extractedDates).toEqual(expectedDates);
        });
    });

    describe('Edge Cases', () => {
        test('handles empty email', () => {
            expect(() => parseEmailThread('')).not.toThrow();
        });

        test('handles missing headers', () => {
            const incompleteEmail = 'Just some content without headers';
            const result = parseEmailThread(incompleteEmail);
            expect(result.messages[0].content).toBe(incompleteEmail);
        });

        test('handles multiple message separators', () => {
            const multiSeparatorEmail = `
                From: a@example.com
                To: b@example.com
                Subject: Test
                
                Message 1
                
                ---------------
                From: b@example.com
                
                Message 2
                
                > From: original
                > Original message
            `;
            
            const result = parseEmailThread(multiSeparatorEmail);
            expect(result.messages.length).toBeGreaterThan(1);
        });

        test('handles various name formats', () => {
            const emailWithNames = `
                From: "John Doe" <john@example.com>
                To: simple@example.com
                Subject: Test
                
                Content
            `;
            
            const result = parseEmailThread(emailWithNames);
            const participants = result.participants;
            
            expect(participants).toContainEqual(
                expect.objectContaining({
                    email: 'john@example.com',
                    name: 'John Doe'
                })
            );
        });
    });
});
