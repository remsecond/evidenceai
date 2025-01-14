const csv = require('csv-parse/sync');

class EmailExtractor {
    async parseEmail(content) {
        try {
            // Extract email components using regex patterns
            const fromMatch = content.match(/From:\s*([^\n]+)/i);
            const toMatch = content.match(/To:\s*([^\n]+)/i);
            const subjectMatch = content.match(/Subject:\s*([^\n]+)/i);
            const dateMatch = content.match(/Date:\s*([^\n]+)/i);

            // Extract body (everything after headers)
            const bodyMatch = content.match(/\n\n([\s\S]+)$/);

            return {
                from: fromMatch ? fromMatch[1].trim() : '',
                to: toMatch ? toMatch[1].trim() : '',
                subject: subjectMatch ? subjectMatch[1].trim() : '',
                date: dateMatch ? new Date(dateMatch[1].trim()) : null,
                body: bodyMatch ? bodyMatch[1].trim() : content,
                attachments: [] // Placeholder for attachment handling
            };
        } catch (error) {
            console.error('Error parsing email:', error.message);
            throw error;
        }
    }

    async parseDataTable(content) {
        try {
            // Parse CSV content
            const records = csv.parse(content, {
                columns: true,
                skip_empty_lines: true
            });

            // Transform records to structured format
            return records.map(record => ({
                timestamp: record.date || record.timestamp || new Date().toISOString(),
                from: record.from || record.sender || '',
                to: record.to || record.recipient || '',
                subject: record.subject || '',
                type: record.type || 'email',
                metadata: { ...record }
            }));
        } catch (error) {
            console.error('Error parsing data table:', error.message);
            throw error;
        }
    }
}

module.exports = { EmailExtractor };
