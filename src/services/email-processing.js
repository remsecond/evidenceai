import { analyzeText } from './ai.js';
import { checkFileSize, formatSizeCheckResult } from '../utils/file-size-checker.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger();

/**
 * Process email document
 */
export async function processEmail(content, analysis) {
    try {
        logger.info('Processing email document');

        // Parse email thread first
        const thread = parseEmailThread(content);

        // Check file size before processing
        const sizeCheck = checkFileSize(content.length);
        logger.info('File size analysis:', formatSizeCheckResult(sizeCheck));

        // If file is too large, fail early with clear message
        if (!sizeCheck.canProcess) {
            throw new Error(formatSizeCheckResult(sizeCheck));
        }

        // Add size check warning to logs if needed
        if (sizeCheck.warning) {
            logger.warn(sizeCheck.warning);
        }

        // Use unified AI service with built-in chunking and size info
        const aiResult = await analyzeText(content, {
            type: 'email',
            format: analysis.format,
            structure: analysis.structure,
            metadata: {
                ...analysis.metadata,
                thread_info: {
                    message_count: thread.messages.length,
                    participant_count: thread.participants.length
                }
            },
            expectedChunks: sizeCheck.estimatedChunks,
            sizeAnalysis: sizeCheck
        });

        // Extract dates from all messages
        const dates = thread.messages.flatMap(message => 
            extractDates(message.content)
        );

        // Combine all analysis results
        const result = {
            success: true,
            format: analysis.format,
            structure: analysis.structure,
            thread,
            metadata: {
                ...analysis.metadata,
                chunking: {
                    enabled: true,
                    chunk_count: aiResult.metadata?.chunk_count || 1,
                    size_analysis: {
                        total_size_mb: sizeCheck.sizeMB,
                        estimated_tokens: sizeCheck.estimatedTokens,
                        processing_category: sizeCheck.category,
                        estimated_time: sizeCheck.metrics.estimatedProcessingTime
                    }
                }
            },
            analysis: {
                semantic: aiResult.semantic,
                validation: aiResult.validation,
                entities: aiResult.entities,
                timeline: extractTimeline(aiResult.entities),
                complex: analyzeComplexPatterns(aiResult.semantic, aiResult.entities),
                dates
            }
        };

        logger.info('Email processing complete');
        return result;

    } catch (error) {
        logger.error('Error processing email:', error);
        throw error;
    }
}

/**
 * Extract timeline from entity analysis
 */
function extractTimeline(entityAnalysis) {
    try {
        const timeline = [];

        // Extract dates and associated events
        if (entityAnalysis.entities && entityAnalysis.entities.dates) {
            entityAnalysis.entities.dates.forEach(date => {
                if (date.attributes && date.attributes.event) {
                    timeline.push({
                        date: date.text,
                        event: date.attributes.event,
                        confidence: date.confidence
                    });
                }
            });
        }

        // Sort timeline by date
        timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        return timeline;
    } catch (error) {
        logger.error('Error extracting timeline:', error);
        return [];
    }
}

/**
 * Analyze complex patterns in the analysis results
 */
function analyzeComplexPatterns(semantic, entities) {
    try {
        const patterns = [];

        // Check for recurring themes
        if (semantic.key_points) {
            const themes = new Map();
            semantic.key_points.forEach(point => {
                if (point.context) {
                    themes.set(point.context, (themes.get(point.context) || 0) + 1);
                }
            });

            themes.forEach((count, theme) => {
                if (count > 1) {
                    patterns.push({
                        type: 'recurring_theme',
                        theme,
                        occurrences: count,
                        confidence: 0.8
                    });
                }
            });
        }

        // Check for relationship patterns
        if (entities.relationships) {
            const relationTypes = new Map();
            entities.relationships.forEach(rel => {
                relationTypes.set(rel.type, (relationTypes.get(rel.type) || 0) + 1);
            });

            relationTypes.forEach((count, type) => {
                if (count > 1) {
                    patterns.push({
                        type: 'relationship_pattern',
                        relationship: type,
                        occurrences: count,
                        confidence: 0.7
                    });
                }
            });
        }

        return patterns;
    } catch (error) {
        logger.error('Error analyzing complex patterns:', error);
        return [];
    }
}

/**
 * Extract dates from email content
 */
export function extractDates(content, options = {}) {
    try {
        const dates = [];
        
        // Extract dates from headers
        const headerMatch = content.match(/^Date:\s*(.+)$/m);
        if (headerMatch) {
            const headerDate = new Date(headerMatch[1]);
            if (!isNaN(headerDate)) {
                dates.push({
                    date: headerDate.toISOString().split('T')[0],
                    original: headerMatch[1],
                    type: 'header',
                    context: 'Email header date',
                    confidence: 1.0
                });
            }
        }

        // Extract dates from body
        const months = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };

        const monthPattern = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
        const ordinalPattern = '(?:st|nd|rd|th)?';
        const yearPattern = '\\d{4}';
        const dayPattern = '\\d{1,2}';
        const weekdayPattern = '(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';

        const datePatterns = [
            // ISO format: 2024-01-15
            { 
                pattern: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, 
                format: 'ISO',
                parse: (match) => {
                    const [_, year, month, day] = match;
                    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                }
            },
            // US format: 1/15/24 or 01/15/2024
            { 
                pattern: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g, 
                format: 'US',
                parse: (match) => {
                    const [_, month, day, year] = match;
                    const fullYear = year.length === 2 ? '20' + year : year;
                    return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                }
            },
            // Written format with ordinal: January 15th, 2024 or January 15, 2024
            { 
                pattern: new RegExp(`\\b(?:completed\\s+on|finalized\\s+on|scheduled\\s+for)?\\s*(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,)?\\s*(\\d{4})\\b`, 'gi'),
                format: 'written',
                parse: (match) => {
                    const [full, monthStr, day, year] = match;
                    const month = months[monthStr.toLowerCase().substring(0, 3)];
                    if (!month) throw new Error('Invalid month');
                    return new Date(`${year}-${month}-${day.padStart(2, '0')}`);
                }
            },
            // Email header format: Mon, 15 Jan 2024 or Monday, January 15, 2024
            {
                pattern: new RegExp(`\\b(?:${weekdayPattern})?[,\\s]*(?:${monthPattern}\\s+)?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,)?\\s*(?:${monthPattern}\\s+)?\\s*(\\d{4})\\b`, 'gi'),
                format: 'header',
                parse: (match) => {
                    const [full] = match;
                    const parts = full.split(/[\s,]+/).filter(Boolean);
                    let monthStr, day, year;
                    
                    // Find month (any word that matches a month name)
                    for (const part of parts) {
                        const monthKey = part.toLowerCase().substring(0, 3);
                        if (months[monthKey]) {
                            monthStr = part;
                            break;
                        }
                    }

                    // Find day (any number that's not a year)
                    for (const part of parts) {
                        if (/^\d{1,2}(?:st|nd|rd|th)?$/.test(part)) {
                            day = part.replace(/(?:st|nd|rd|th)$/, '');
                            break;
                        }
                    }

                    // Find year (any 4-digit number)
                    for (const part of parts) {
                        if (/^\d{4}$/.test(part)) {
                            year = part;
                            break;
                        }
                    }

                    if (!monthStr || !day || !year) throw new Error('Invalid date format');
                    const month = months[monthStr.toLowerCase().substring(0, 3)];
                    if (!month) throw new Error('Invalid month');
                    return new Date(`${year}-${month}-${day.padStart(2, '0')}`);
                }
            }
        ];

        // Process content for dates
        const processContent = (text) => {
            // First normalize line endings and whitespace
            const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n/g, ' ').replace(/\s+/g, ' ');
            
            // Track positions of found dates to avoid duplicates
            const foundPositions = new Set();
            
            datePatterns.forEach(({ pattern, format, parse }) => {
                let match;
                const regex = new RegExp(pattern.source, pattern.flags);
                while ((match = regex.exec(normalizedText)) !== null) {
                    // Skip if we've already found a date at this position
                    if (foundPositions.has(match.index)) continue;
                    
                    const dateStr = match[0].trim();
                    const context = normalizedText.substring(
                        Math.max(0, match.index - 50),
                        Math.min(normalizedText.length, match.index + dateStr.length + 50)
                    );
                    
                    try {
                        const date = parse(match);
                        if (!isNaN(date)) {
                            const isoDate = date.toISOString().split('T')[0];
                            // Only add if not already present with higher confidence
                            const existing = dates.find(d => d.date === isoDate);
                            if (!existing || existing.confidence < (format === 'ISO' ? 1.0 : 0.9)) {
                                dates.push({
                                    date: isoDate,
                                    original: dateStr,
                                    type: 'content',
                                    format,
                                    context: context.trim(),
                                    confidence: format === 'ISO' ? 1.0 : 0.9
                                });
                                foundPositions.add(match.index);
                            }
                        }
                    } catch (error) {
                        // Log the error and continue with other patterns
                        logger.warn('Failed to parse date:', { 
                            dateStr, 
                            error: error.message,
                            pattern: pattern.source,
                            format,
                            text: normalizedText
                        });
                    }
                }
            });

            // Debug log all found dates
            logger.info('Found dates:', dates.map(d => ({
                date: d.date,
                original: d.original,
                format: d.format,
                context: d.context
            })));
        };

        // Process headers and body separately to maintain context
        if (headerMatch) {
            processContent(headerMatch[0]);
        }
        processContent(content);

        // Remove duplicates while keeping highest confidence version
        const uniqueDates = new Map();
        dates.forEach(date => {
            if (!uniqueDates.has(date.date) || date.confidence > uniqueDates.get(date.date).confidence) {
                uniqueDates.set(date.date, date);
            }
        });

        // Convert back to array and sort chronologically
        return Array.from(uniqueDates.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));

    } catch (error) {
        logger.error('Error extracting dates:', error);
        return [];
    }
}

/**
 * Parse and analyze email thread
 */
export function parseEmailThread(content) {
    try {
        logger.info('Parsing email thread');

        const messages = [];
        const threadMarkers = [
            /^-{3,}\s*Original Message\s*-{3,}/im,
            /^On.*wrote:$/im,
            /^From:.*\[mailto:.*\].*Sent:/im,
            /^>{3,}/m,
            /^From:.*\nSent:/im
        ];

        // Split content into messages using thread markers and headers
        const parts = [];
        let currentContent = content;

        // First split by thread markers and headers
        const boundaries = [];
        let match;

        // Find thread markers
        threadMarkers.forEach(marker => {
            const regex = new RegExp(marker.source, marker.flags);
            let lastIndex = 0;
            while ((match = regex.exec(currentContent)) !== null) {
                boundaries.push({ index: match.index, type: 'marker' });
                lastIndex = match.index + match[0].length;
            }
        });

        // Find header blocks
        const headerRegex = /(?:^|\n)(?=From:.*(?:\n(?:To|Subject|Date):.*)*)/g;
        while ((match = headerRegex.exec(currentContent)) !== null) {
            boundaries.push({ index: match.index === 0 ? 0 : match.index + 1, type: 'header' });
        }

        // Sort boundaries by index
        boundaries.sort((a, b) => a.index - b.index);

        // Split content at boundaries
        if (boundaries.length === 0) {
            parts.push(currentContent.trim());
        } else {
            // Add start of content if needed
            if (boundaries[0].index > 0) {
                const firstPart = currentContent.slice(0, boundaries[0].index).trim();
                if (firstPart) parts.push(firstPart);
            }

            // Process each boundary
            for (let i = 0; i < boundaries.length; i++) {
                const start = boundaries[i].index;
                const end = boundaries[i + 1] ? boundaries[i + 1].index : currentContent.length;
                const part = currentContent.slice(start, end).trim();

                // Skip if part is just a thread marker
                let isThreadMarker = false;
                if (boundaries[i].type === 'marker') {
                    threadMarkers.forEach(marker => {
                        if (part.match(new RegExp(`^${marker.source}$`, 'im'))) {
                            isThreadMarker = true;
                        }
                    });
                }

                if (!isThreadMarker && part) {
                    parts.push(part);
                }
            }
        }

        // Process each part
        parts.forEach(part => {
            const trimmedPart = part.trim();
            if (!trimmedPart) return;

            // Extract headers and body
            const headers = {};
            const lines = trimmedPart.split('\n');
            let currentHeader = '';
            let headerValue = '';
            let bodyStart = 0;
            let inHeaders = true;

            // Process headers
            for (let i = 0; i < lines.length && inHeaders; i++) {
                const line = lines[i].trim();
                const headerMatch = line.match(/^(From|To|Subject|Date):\s*(.*)$/i);

                if (headerMatch) {
                    if (currentHeader) {
                        headers[currentHeader.toLowerCase()] = headerValue.trim();
                    }
                    currentHeader = headerMatch[1];
                    headerValue = headerMatch[2];
                    bodyStart = i + 1;
                } else if (!line) {
                    if (currentHeader) {
                        headers[currentHeader.toLowerCase()] = headerValue.trim();
                    }
                    bodyStart = i + 1;
                    inHeaders = false;
                } else if (line.startsWith(' ') && currentHeader) {
                    headerValue += ' ' + line.trim();
                } else if (inHeaders && Object.keys(headers).length > 0) {
                    if (currentHeader) {
                        headers[currentHeader.toLowerCase()] = headerValue.trim();
                    }
                    bodyStart = i;
                    inHeaders = false;
                }
            }

            // Save last header if we ended while still in headers
            if (currentHeader) {
                headers[currentHeader.toLowerCase()] = headerValue.trim();
            }

            // Extract body
            const body = lines.slice(bodyStart).join('\n').trim();

            // Add message if it has required headers or is the first message without headers
            if ((headers.from && headers.to) || (messages.length === 0 && body)) {
                messages.push({
                    headers: headers.from && headers.to ? headers : {},
                    content: body,
                    index: messages.length,
                    timestamp: headers.date ? new Date(headers.date).getTime() : 0
                });
            }
        });

        // Handle content without headers
        if (messages.length === 0 && content.trim()) {
            messages.push({
                headers: {},
                content: content.trim(),
                index: 0,
                timestamp: 0
            });
        }

        // Sort messages chronologically
        messages.sort((a, b) => a.timestamp - b.timestamp);

        // Build thread object
        return {
            subject: messages[0]?.headers.subject || '',
            messages: messages.map(message => ({
                ...message,
                from: message.headers.from,
                to: message.headers.to,
                subject: message.headers.subject
            })),
            participants: extractThreadParticipants(messages),
            metadata: {
                total_messages: messages.length,
                date_range: {
                    start: messages[0]?.headers.date,
                    end: messages[messages.length - 1]?.headers.date
                }
            }
        };

    } catch (error) {
        logger.error('Error parsing email thread:', error);
        throw error;
    }
}

/**
 * Extract participants from thread messages
 */
function extractThreadParticipants(messages) {
    const participants = new Map();
    const roles = new Map();
    const emailMap = new Map();

    // First pass - identify initial sender and recipient
    if (messages.length > 0) {
        const firstMessage = messages[0];
        if (firstMessage.headers.from) {
            const { name, email } = extractNameAndEmail(firstMessage.headers.from);
            roles.set(email, 'initiator');
            emailMap.set(firstMessage.headers.from, email);
        }
        if (firstMessage.headers.to) {
            const { name, email } = extractNameAndEmail(firstMessage.headers.to);
            roles.set(email, 'responder');
            emailMap.set(firstMessage.headers.to, email);
        }
    }

    // Second pass - track all participants and their roles
    messages.forEach((message, index) => {
        const from = message.headers.from;
        const to = message.headers.to;

        if (from) {
            const { name, email } = extractNameAndEmail(from);
            const fromParticipant = participants.get(email) || {
                email,
                name,
                role: roles.get(email) || 'recipient',
                messages_sent: 0,
                messages_received: 0
            };
            fromParticipant.messages_sent++;
            participants.set(email, fromParticipant);
            emailMap.set(from, email);
        }

        if (to) {
            const { name, email } = extractNameAndEmail(to);
            const toParticipant = participants.get(email) || {
                email,
                name,
                role: roles.get(email) || 'responder',
                messages_sent: 0,
                messages_received: 0
            };
            toParticipant.messages_received++;
            participants.set(email, toParticipant);
            emailMap.set(to, email);
        }
    });

    return Array.from(participants.values());
}

/**
 * Extract name from email address
 */
/**
 * Extract name and email from various formats
 */
function extractNameAndEmail(input) {
    if (!input) return { name: '', email: '' };

    const formats = [
        // "Full Name" <email@example.com>
        {
            regex: /^"([^"]+)"\s*<([^>]+)>$/,
            nameIndex: 1,
            emailIndex: 2
        },
        // Full Name <email@example.com>
        {
            regex: /^([^<]+?)\s*<([^>]+)>$/,
            nameIndex: 1,
            emailIndex: 2
        },
        // Full Name (email@example.com)
        {
            regex: /^([^(]+?)\s*\(([^)]+)\)$/,
            nameIndex: 1,
            emailIndex: 2
        },
        // email@example.com (Full Name)
        {
            regex: /^([^(\s]+)\s*\(([^)]+)\)$/,
            nameIndex: 2,
            emailIndex: 1
        },
        // email@example.com
        {
            regex: /^<?([^@\s]+@[^>\s]+)>?$/,
            nameIndex: null,
            emailIndex: 1
        }
    ];

    for (const format of formats) {
        const match = input.match(format.regex);
        if (match) {
            const email = match[format.emailIndex].replace(/[<>]/g, '').trim();
            let name = format.nameIndex ? match[format.nameIndex].trim() : '';

            // If no name found, format email username
            if (!name) {
                const username = email.split('@')[0];
                name = username
                    .replace(/[._-]/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
            }

            return { name, email };
        }
    }

    // If no format matches, treat entire input as email
    return {
        name: input.split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase()),
        email: input.trim()
    };
}

/**
 * Extract name from email address string
 */
function extractName(email) {
    return extractNameAndEmail(email).name;
}

export default {
    processEmail,
    extractDates,
    parseEmailThread
};
