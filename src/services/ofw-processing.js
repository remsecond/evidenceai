import { getLogger } from '../utils/logging.js';
import { analyzeText } from './ai.js';

const logger = getLogger();

/**
 * Utility functions for OFW processing
 */
export const utils = {
    /**
     * Extract email headers from OFW content
     */
    extractHeaders(content) {
        const headers = {};
        const headerRegex = /^(From|To|Subject|Date):\s*(.+)$/gm;
        let match;
        
        while ((match = headerRegex.exec(content)) !== null) {
            headers[match[1].toLowerCase()] = match[2].trim();
        }

        return headers;
    },

    /**
     * Extract message body without headers
     */
    extractBody(content) {
        const parts = content.split(/\n\s*\n/);
        // Skip header section
        for (let i = 0; i < parts.length; i++) {
            if (!parts[i].match(/^(From|To|Subject|Date):/m)) {
                return parts.slice(i).join('\n\n');
            }
        }
        return '';
    },

    /**
     * Validate OFW email format
     */
    validateFormat(content) {
        const headers = this.extractHeaders(content);
        const requiredHeaders = ['from', 'to', 'subject'];
        const missingHeaders = requiredHeaders.filter(h => !headers[h]);

        return {
            valid: missingHeaders.length === 0,
            headers,
            missingHeaders,
            body: this.extractBody(content)
        };
    },

    /**
     * Format OFW content for processing
     */
    formatContent(content) {
        const { headers, body } = this.validateFormat(content);
        return {
            headers,
            body,
            formatted: `
Subject: ${headers.subject || ''}

${body}`.trim()
        };
    },

    /**
     * Extract events from content
     */
    extractEvents({ content }) {
        const events = [];
        const dateRegex = /\b(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/g;
        const timeRegex = /\b(?:1[0-2]|0?[1-9]):[0-5][0-9]\s*(?:AM|PM)\b/gi;
        
        let match;
        while ((match = dateRegex.exec(content)) !== null) {
            const date = match[0];
            const context = content.substring(
                Math.max(0, match.index - 50),
                Math.min(content.length, match.index + date.length + 50)
            );

            // Look for times near the date
            const timeMatches = [...context.matchAll(timeRegex)];
            if (timeMatches.length > 0) {
                events.push({
                    date,
                    times: timeMatches.map(m => m[0]),
                    context: context.trim(),
                    type: determineEventType(context)
                });
            }
        }

        return events;
    },

    /**
     * Extract schedule changes from content
     */
    extractScheduleChanges({ content }) {
        const changes = [];
        const changePatterns = [
            {
                pattern: /\b(?:change|modify|adjust|update|revise)\s+(?:the\s+)?schedule\b/gi,
                type: 'explicit'
            },
            {
                pattern: /\b(?:reschedule|postpone|delay)\b/gi,
                type: 'reschedule'
            },
            {
                pattern: /\b(?:instead\s+of|rather\s+than)\b/gi,
                type: 'alternative'
            },
            {
                pattern: /\b(?:can't|cannot|won't be able to)\s+(?:make|do|attend)\b/gi,
                type: 'cancellation'
            }
        ];

        for (const { pattern, type } of changePatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const context = content.substring(
                    Math.max(0, match.index - 100),
                    Math.min(content.length, match.index + match[0].length + 100)
                );

                const original = extractOriginalSchedule(context);
                const newSchedule = extractNewSchedule(context);
                
                if (original || newSchedule) {
                    changes.push({
                        type: 'schedule_change',
                        change_type: type,
                        context: context.trim(),
                        original,
                        new: newSchedule,
                        impact: determineScheduleImpact(original, newSchedule, context)
                    });
                }
            }
        }

        return changes;
    },

    /**
     * Extract participants from content
     */
    extractParticipants({ from, to, content }) {
        const participants = new Map();

        // Add email participants with roles
        const fromRole = determineParticipantRole(from, content, true);
        const toRole = determineParticipantRole(to, content, false);
        
        participants.set(from, { 
            email: from,
            name: extractName(from),
            role: fromRole,
            mentions: 1,
            source: 'email',
            is_sender: true
        });
        
        participants.set(to, { 
            email: to,
            name: extractName(to),
            role: toRole,
            mentions: 1,
            source: 'email',
            is_recipient: true
        });

        // Look for additional participants in content
        const namePatterns = [
            /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Jr\.|Sr\.|III|IV)?\b/g
        ];

        for (const pattern of namePatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const name = match[0];
                if (participants.has(name)) {
                    participants.get(name).mentions++;
                } else {
                    const role = determineRole(name, content);
                    participants.set(name, {
                        name,
                        role,
                        mentions: 1,
                        source: 'content',
                        relationship: determineRelationship(role, content)
                    });
                }
            }
        }

        return Array.from(participants.values());
    },

    /**
     * Analyze custody patterns
     */
    async analyzeCustodyPatterns(info) {
        try {
            const patterns = {
                communication: [],
                schedule: [],
                compliance: {
                    adherence: {
                        score: 0,
                        violations: []
                    },
                    communication: {
                        score: 0,
                        issues: []
                    }
                }
            };

            // Analyze communication patterns
            if (info.analysis.complex?.patterns) {
                patterns.communication = info.analysis.complex.patterns
                    .filter(p => p.type === 'communication_pattern')
                    .map(p => ({
                        type: p.description,
                        confidence: p.confidence,
                        impact: determineCommunicationImpact(p, info)
                    }));
            }

            // Analyze schedule patterns
            if (info.schedule_changes?.length > 0) {
                patterns.schedule = analyzeSchedulePatterns(info.schedule_changes);
            }

            // Analyze compliance
            patterns.compliance = analyzeCompliance(info);

            return patterns;
        } catch (error) {
            logger.error('Error analyzing custody patterns:', error);
            return null;
        }
    }
};

/**
 * Determine custody message type
 */
function determineCustodyType(content) {
    const lowerContent = content.toLowerCase();
    
    // Check for custody exchange indicators
    if (/(pickup|drop\s*off|exchange|transfer|custody\s+time)/i.test(lowerContent)) {
        return 'custody_exchange';
    }
    
    // Check for schedule change indicators
    if (/(change|modify|adjust|update|revise)\s+(the\s+)?schedule/i.test(lowerContent)) {
        return 'schedule_change';
    }
    
    // Check for violation indicators
    if (/(violat|breach|fail|not\s+follow|against\s+agreement)/i.test(lowerContent)) {
        return 'violation';
    }
    
    return 'general';
}

/**
 * Determine event type from context
 */
function determineEventType(context) {
    const lowerContext = context.toLowerCase();
    
    if (/(pickup|drop\s*off|exchange|transfer|custody\s+time)/i.test(lowerContext)) {
        return 'custody_exchange';
    }
    
    if (/(doctor|medical|appointment|checkup|health)/i.test(lowerContext)) {
        return 'medical';
    }
    
    if (/(school|class|teacher|study|education)/i.test(lowerContext)) {
        return 'education';
    }
    
    if (/(activity|sport|practice|game|recital|event)/i.test(lowerContext)) {
        return 'activity';
    }
    
    return 'other';
}

/**
 * Extract original schedule from context
 */
function extractOriginalSchedule(context) {
    const patterns = [
        /(?:originally|currently|was)\s+(?:scheduled\s+)?(?:for|on)\s+([^.]+)/i,
        /instead\s+of\s+([^.]+)/i,
        /rather\s+than\s+([^.]+)/i,
        /(?:can't|cannot|won't)\s+(?:make|do|attend)\s+(?:the|on|at)\s+([^.]+)/i
    ];

    for (const pattern of patterns) {
        const match = context.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    return null;
}

/**
 * Extract new schedule from context
 */
function extractNewSchedule(context) {
    const patterns = [
        /(?:change|modify|adjust|update|revise)\s+(?:the\s+)?schedule\s+to\s+([^.]+)/i,
        /(?:reschedule|postpone|delay)\s+(?:to|until|for)\s+([^.]+)/i,
        /would\s+like\s+to\s+(?:change|move)\s+(?:it\s+)?to\s+([^.]+)/i,
        /(?:suggest|propose|request)\s+(?:moving|changing)\s+(?:it\s+)?to\s+([^.]+)/i
    ];

    for (const pattern of patterns) {
        const match = context.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    return null;
}

/**
 * Determine schedule change impact
 */
function determineScheduleImpact(original, newSchedule, context) {
    // Check for urgency indicators
    const isUrgent = /\b(?:urgent|emergency|asap|immediately)\b/i.test(context);
    
    // Check for short notice
    const shortNotice = /\b(?:today|tomorrow|tonight)\b/i.test(context);
    
    // Check for duration of change
    const isTemporary = /\b(?:temporary|just\s+this\s+time|one\s+time)\b/i.test(context);
    
    // Check for reason indicators
    const hasReason = /\b(?:because|due\s+to|as|since)\b/i.test(context);
    
    return {
        urgency: isUrgent ? 'high' : shortNotice ? 'medium' : 'low',
        duration: isTemporary ? 'temporary' : 'undefined',
        justified: hasReason,
        notice_period: shortNotice ? 'short' : 'standard'
    };
}

/**
 * Determine participant role from context
 */
function determineRole(name, content) {
    const lowerContent = content.toLowerCase();
    const nameContext = new RegExp(`\\b${name}\\b[^.!?]*[.!?]`, 'gi');
    let role = 'unknown';
    
    // Look for role indicators in sentences containing the name
    let match;
    while ((match = nameContext.exec(content)) !== null) {
        const sentence = match[0].toLowerCase();
        
        if (/(mother|mom|mama|parent)/i.test(sentence)) {
            role = 'mother';
            break;
        }
        if (/(father|dad|papa|parent)/i.test(sentence)) {
            role = 'father';
            break;
        }
        if (/(child|son|daughter|kid)/i.test(sentence)) {
            role = 'child';
            break;
        }
        if (/(attorney|lawyer|counsel|legal)/i.test(sentence)) {
            role = 'legal';
            break;
        }
        if (/(mediator|coordinator|supervisor)/i.test(sentence)) {
            role = 'mediator';
            break;
        }
    }
    
    return role;
}

/**
 * Determine participant role for email addresses
 */
function determineParticipantRole(email, content, isSender) {
    const name = extractName(email);
    const baseRole = determineRole(name, content);
    
    if (baseRole !== 'unknown') {
        return baseRole;
    }
    
    // If role couldn't be determined from content, infer from email patterns
    if (/@(court|legal|law)/.test(email)) {
        return 'legal';
    }
    if (/@(mediat|coord|supervis)/.test(email)) {
        return 'mediator';
    }
    
    // Default to parent role for primary participants
    return 'parent';
}

/**
 * Determine relationship between participants
 */
function determineRelationship(role, content) {
    if (role === 'child') {
        if (/(son|boy|male)/i.test(content)) {
            return 'son';
        }
        if (/(daughter|girl|female)/i.test(content)) {
            return 'daughter';
        }
    }
    return null;
}

/**
 * Extract name from email address
 */
function extractName(email) {
    const nameMatch = email.match(/^"?([^"<]+)"?\s*(?:<[^>]+>)?$/);
    return nameMatch ? nameMatch[1].trim() : email;
}

/**
 * Analyze schedule change patterns
 */
function analyzeSchedulePatterns(changes) {
    const patterns = [];
    
    // Check frequency of changes
    if (changes.length > 3) {
        patterns.push({
            type: 'frequent_changes',
            description: 'Multiple schedule changes requested',
            frequency: changes.length,
            severity: changes.length > 5 ? 'high' : 'medium'
        });
    }
    
    // Check for last-minute changes
    const lastMinuteChanges = changes.filter(change => {
        if (!change.impact) return false;
        return change.impact.notice_period === 'short';
    });
    
    if (lastMinuteChanges.length > 0) {
        patterns.push({
            type: 'last_minute_changes',
            description: 'Last-minute schedule changes',
            count: lastMinuteChanges.length,
            severity: lastMinuteChanges.length > 2 ? 'high' : 'medium'
        });
    }
    
    // Check for unjustified changes
    const unjustifiedChanges = changes.filter(change => {
        if (!change.impact) return false;
        return !change.impact.justified;
    });
    
    if (unjustifiedChanges.length > 0) {
        patterns.push({
            type: 'unjustified_changes',
            description: 'Schedule changes without clear justification',
            count: unjustifiedChanges.length,
            severity: 'medium'
        });
    }
    
    return patterns;
}

/**
 * Analyze compliance patterns
 */
function analyzeCompliance(info) {
    const compliance = {
        adherence: {
            score: 1.0, // Start with perfect score
            violations: [],
            issues: []
        },
        communication: {
            score: 1.0,
            issues: [],
            tone: null
        }
    };
    
    // Check for specific violations
    if (info.events) {
        info.events.forEach(event => {
            if (event.type === 'violation') {
                compliance.adherence.violations.push({
                    date: event.date,
                    description: event.context,
                    severity: determineSeverity(event.context)
                });
                compliance.adherence.score -= 0.2; // Deduct for each violation
            }
        });
    }
    
    // Check schedule changes
    if (info.schedule_changes) {
        info.schedule_changes.forEach(change => {
            if (change.impact?.notice_period === 'short') {
                compliance.adherence.issues.push({
                    type: 'short_notice',
                    description: 'Schedule change with insufficient notice',
                    context: change.context
                });
                compliance.adherence.score -= 0.1;
            }
            if (!change.impact?.justified) {
                compliance.adherence.issues.push({
                    type: 'unjustified',
                    description: 'Schedule change without clear justification',
                    context: change.context
                });
                compliance.adherence.score -= 0.1;
            }
        });
    }
    
    // Analyze communication tone
    if (info.analysis.complex?.tone) {
        const tone = info.analysis.complex.tone;
        compliance.communication.tone = tone.overall;
        
        if (tone.overall.sentiment === 'negative') {
            compliance.communication.issues.push({
                type: 'negative_tone',
                intensity: tone.overall.intensity,
                segments: tone.segments
            });
            compliance.communication.score -= 0.3;
        }
        
        if (tone.segments) {
            const hostileSegments = tone.segments.filter(s => 
                s.sentiment === 'negative' && s.intensity > 0.7
            );
            if (hostileSegments.length > 0) {
                compliance.communication.issues.push({
                    type: 'hostile_language',
                    count: hostileSegments.length,
                    segments: hostileSegments
                });
                compliance.communication.score -= 0.2 * hostileSegments.length;
            }
        }
    }
    
    // Ensure scores don't go below 0
    compliance.adherence.score = Math.max(0, compliance.adherence.score);
    compliance.communication.score = Math.max(0, compliance.communication.score);
    
    return compliance;
}

/**
 * Determine severity of violation
 */
function determineSeverity(context) {
    const lowerContext = context.toLowerCase();
    
    if (/(danger|harm|threat|unsafe)/i.test(lowerContext)) {
        return 'critical';
    }
    if (/(significant|serious|major)/i.test(lowerContext)) {
        return 'high';
    }
    if (/(minor|small|slight)/i.test(lowerContext)) {
        return 'low';
    }
    return 'medium';
}

/**
 * Determine communication pattern impact
 */
function determineCommunicationImpact(pattern, info) {
    const impact = {
        severity: 'low',
        scope: 'limited',
        requires_action: false
    };
    
    // Check pattern confidence
    if (pattern.confidence < 0.5) {
        return impact;
    }
    
    // Analyze pattern type
    if (pattern.type.includes('conflict')) {
        impact.severity = 'high';
        impact.scope = 'broad';
        impact.requires_action = true;
    } else if (pattern.type.includes('cooperation')) {
        impact.severity = 'low';
        impact.scope = 'positive';
    }
    
    // Consider tone if available
    if (info.analysis.complex?.tone?.overall) {
        const tone = info.analysis.complex.tone.overall;
        if (tone.sentiment === 'negative' && tone.intensity > 0.7) {
            impact.severity = 'high';
            impact.requires_action = true;
        }
    }
    
    return impact;
}

/**
 * Process OFW message content
 */
export async function processOFW(content, options = {}) {
    try {
        logger.info('Processing OFW message');

        // Extract and validate content
        const { valid, headers, body } = utils.validateFormat(content);
        if (!valid) {
            throw new Error('Invalid OFW message format');
        }

        // Analyze content using AI service
        const analysis = await analyzeText(content, {
            ...options,
            type: 'ofw_message'
        });

        // Extract custody-related information
        const custody = {
            type: determineCustodyType(content),
            events: utils.extractEvents({ content }),
            schedule_changes: utils.extractScheduleChanges({ content }),
            participants: utils.extractParticipants({
                from: headers.from,
                to: headers.to,
                content: body
            })
        };

        // Analyze patterns
        const patterns = await utils.analyzeCustodyPatterns({
            type: custody.type,
            events: custody.events,
            schedule_changes: custody.schedule_changes,
            participants: custody.participants,
            analysis: analysis
        });

        return {
            content,
            custody,
            patterns,
            analysis,
            metadata: {
                type: 'ofw_message',
                processed_at: new Date().toISOString()
            }
        };
    } catch (error) {
        logger.error('Error processing OFW message', { error });
        throw error;
    }
}

/**
 * Process OFW email content
 */
export async function processOFWEmail(content, options = {}) {
    try {
        logger.info('Processing OFW email');

        // Extract and validate content
        const { valid, headers, body } = utils.validateFormat(content);
        if (!valid) {
            throw new Error('Invalid OFW email format');
        }

        // Analyze content using AI service
        const analysis = await analyzeText(content, {
            ...options,
            type: 'ofw_email'
        });

        // Extract custody-related information
        const custodyType = determineCustodyType(content);
        const events = utils.extractEvents({ content });
        const scheduleChanges = utils.extractScheduleChanges({ content });
        const participants = utils.extractParticipants({
            from: headers.from,
            to: headers.to,
            content: body
        });

        // Build custody info
        const custody = {
            type: custodyType,
            events,
            schedule_changes: scheduleChanges,
            participants: participants.map(p => ({
                ...p,
                role: p.role === 'unknown' ? determineRole(p.name, content) : p.role
            }))
        };

        // Analyze patterns
        const patterns = await utils.analyzeCustodyPatterns({
            type: custody.type,
            events: custody.events,
            schedule_changes: custody.schedule_changes,
            participants: custody.participants,
            analysis
        });

        return {
            content,
            custody,
            patterns,
            analysis,
            metadata: {
                type: 'ofw_email',
                processed_at: new Date().toISOString()
            }
        };
    } catch (error) {
        logger.error('Error processing OFW email', { error });
        throw error;
    }
}

export default {
    processOFWEmail,
    processOFW,
    utils
};
