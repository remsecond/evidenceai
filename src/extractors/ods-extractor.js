class ODSExtractor {
    async extractMessages(content) {
        try {
            // Split content into messages
            const messages = [];
            const lines = content.split('\n');
            let currentMessage = null;

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                // Check for message header patterns
                const dateMatch = line.match(/Date:\s*(.+)/i);
                const fromMatch = line.match(/From:\s*(.+)/i);
                const messageMatch = line.match(/Message:\s*(.+)/i);

                if (dateMatch || fromMatch) {
                    // Save previous message if exists
                    if (currentMessage && currentMessage.content) {
                        messages.push(currentMessage);
                    }
                    // Start new message
                    currentMessage = {
                        timestamp: null,
                        author: '',
                        content: ''
                    };
                }

                if (dateMatch) {
                    currentMessage.timestamp = new Date(dateMatch[1]).toISOString();
                } else if (fromMatch) {
                    currentMessage.author = fromMatch[1].trim();
                } else if (messageMatch) {
                    currentMessage.content = messageMatch[1].trim();
                } else if (currentMessage) {
                    // Append to current message content
                    if (currentMessage.content) {
                        currentMessage.content += ' ' + line;
                    } else {
                        currentMessage.content = line;
                    }
                }
            }

            // Add last message
            if (currentMessage && currentMessage.content) {
                messages.push(currentMessage);
            }

            return messages;
        } catch (error) {
            console.error('Error extracting OFW messages:', error.message);
            throw error;
        }
    }
}

module.exports = { ODSExtractor };
