import fs from "fs";
import { createRequire } from "module";
import BaseProcessor from "./base-processor.js";
import { getLogger } from "../utils/logging.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const logger = getLogger();

// Maximum tokens per chunk (staying within context limits)
const MAX_CHUNK_SIZE = 25000;

export class PDFProcessor extends BaseProcessor {
  constructor() {
    super();
    this.maxChunkSize = MAX_CHUNK_SIZE;
  }

  /**
   * Process a PDF file into our base document structure
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} Processed document in base format
   */
  async processPdf(filePath) {
    try {
      logger.info("Starting PDF processing:", filePath);
      const startTime = Date.now();

      // Create base document
      let doc = this.createBaseDocument(filePath);

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileInfo = {
        path: filePath,
        size_bytes: stats.size,
        size_mb: (stats.size / (1024 * 1024)).toFixed(2),
        created: stats.birthtime,
        modified: stats.mtime,
      };

      // Read and parse PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer, { max: 0 });

      // Process content into timeline events
      const sections = this.identifySections(pdfData.text);
      for (const section of sections) {
        // Add section as an event
        doc = this.addTimelineEvent(doc, {
          type: "document",
          content: section.header || "Untitled Section",
          participants: [], // Will be extracted from content
          topics: this.extractTopics(section.content),
        });

        // Process section content into events
        const contentEvents = this.processContentIntoEvents(section.content);
        for (const event of contentEvents) {
          doc = this.addTimelineEvent(doc, event);
        }

        // Extract and add relationships
        doc = this.extractRelationships(section.content, doc);
      }

      // Add document metadata
      doc.metadata = {
        ...doc.metadata,
        pdf_info: {
          pages: pdfData.numpages,
          version: pdfData.pdfInfo?.PDFFormatVersion,
          info: pdfData.info,
        },
        statistics: this.calculateStatistics(pdfData.text),
        processing_meta: {
          timestamp: new Date().toISOString(),
          version: "1.0",
          processing_time_ms: Date.now() - startTime,
        },
      };

      // Validate final document
      const validationResult = await this.validateData(doc);
      if (!validationResult.isValid) {
        logger.error("Validation failed:", validationResult.errors);
        doc = this.updateValidationStatus(doc, "invalid");
        return doc;
      }

      doc = this.updateValidationStatus(doc, "valid");
      logger.info("PDF processing complete", {
        pages: doc.metadata.pdf_info.pages,
        events: doc.timeline.events.length,
        processing_time: doc.metadata.processing_meta.processing_time_ms,
      });

      return doc;
    } catch (error) {
      logger.error("Error processing PDF:", error);
      throw error;
    }
  }

  /**
   * Process section content into timeline events with enhanced structure
   * @private
   */
  processContentIntoEvents(content) {
    const events = [];
    const paragraphs = content.split(/\n\s*\n/);

    // Extract key information for section summary
    const keyPoints = this.extractKeyPoints(content);
    if (keyPoints.length > 0) {
      events.push({
        type: "summary",
        content: "Section Summary:",
        key_points: keyPoints,
        participants: this.extractParticipants(content),
        topics: this.extractTopics(content),
        metadata: {
          type: "section_summary",
          importance: "high",
        },
      });
    }

    // Process individual paragraphs
    for (const paragraph of paragraphs) {
      if (paragraph.trim()) {
        // Extract and standardize dates
        const dates = this.extractDates(paragraph);

        // Detect content type and add annotations
        const annotations = this.annotateContent(paragraph);

        // Create structured event
        events.push({
          type: "message",
          content: this.formatContent(paragraph, annotations),
          participants: this.extractParticipants(paragraph),
          topics: this.extractTopics(paragraph),
          dates: dates,
          annotations: annotations,
          metadata: {
            type: annotations.primary_type || "general",
            importance: annotations.importance || "normal",
            context: annotations.context || null,
            ambiguities: annotations.ambiguities || [],
          },
        });
      }
    }

    return events;
  }

  /**
   * Extract key points from content
   * @private
   */
  extractKeyPoints(content) {
    const keyPoints = [];

    // Patterns for key information
    const patterns = {
      decisions:
        /(?:decided|agreed|resolved|approved|confirmed)\s+(?:to|that|on)\s+([^.!?]+[.!?])/gi,
      actions: /(?:will|must|needs? to|should|shall)\s+([^.!?]+[.!?])/gi,
      deadlines: /(?:by|before|due|deadline)\s+([^.!?]+[.!?])/gi,
      disputes:
        /(?:disagree|dispute|contest|object|challenge)\s+([^.!?]+[.!?])/gi,
    };

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = content.match(pattern) || [];
      matches.forEach((match) => {
        keyPoints.push({
          type,
          content: match.trim(),
        });
      });
    });

    return keyPoints;
  }

  /**
   * Extract and standardize dates
   * @private
   */
  extractDates(text) {
    const dates = [];

    // Date patterns
    const patterns = [
      // MM/DD/YYYY
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
      // Month DD, YYYY
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})\b/g,
      // Relative dates
      /\b(?:today|tomorrow|yesterday|next|last)\s+(?:week|month|year|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g,
    ];

    patterns.forEach((pattern) => {
      const matches = text.match(pattern) || [];
      matches.forEach((match) => {
        // Convert to ISO format
        const date = this.standardizeDate(match);
        if (date) {
          dates.push({
            original: match,
            iso: date,
            type: "explicit",
          });
        }
      });
    });

    return dates;
  }

  /**
   * Annotate content with type and context
   * @private
   */
  annotateContent(text) {
    const annotations = {
      primary_type: "general",
      importance: "normal",
      context: null,
      ambiguities: [],
      tags: [],
    };

    // Content type detection
    if (text.match(/\b(?:court|legal|attorney|judge|hearing)\b/i)) {
      annotations.primary_type = "legal";
      annotations.tags.push("[Legal Issue]");
    }
    if (text.match(/\b(?:pay|cost|expense|budget|money)\b/i)) {
      annotations.primary_type = "financial";
      annotations.tags.push("[Expense]");
    }
    if (text.match(/\b(?:child|custody|visitation|parenting)\b/i)) {
      annotations.primary_type = "parenting";
      annotations.tags.push("[Parenting Issue]");
    }

    // Importance detection
    if (text.match(/\b(?:urgent|important|critical|immediate|asap)\b/i)) {
      annotations.importance = "high";
    }

    // Ambiguity detection
    const ambiguityPatterns = [
      /\b(?:unclear|ambiguous|vague|uncertain|not sure)\b/i,
      /\b(?:what does this mean|please clarify|need clarification)\b/i,
    ];

    ambiguityPatterns.forEach((pattern) => {
      const match = text.match(pattern);
      if (match) {
        annotations.ambiguities.push({
          type: "needs_clarification",
          context: match[0],
        });
      }
    });

    return annotations;
  }

  /**
   * Format content with annotations
   * @private
   */
  formatContent(text, annotations) {
    let formatted = text;

    // Add tags at the start
    if (annotations.tags.length > 0) {
      formatted = `${annotations.tags.join(" ")} ${formatted}`;
    }

    // Add importance marker if high
    if (annotations.importance === "high") {
      formatted = `[IMPORTANT] ${formatted}`;
    }

    // Add ambiguity notes
    if (annotations.ambiguities.length > 0) {
      formatted += "\n[Note: Contains ambiguities that may need clarification]";
    }

    return formatted;
  }

  /**
   * Standardize date to ISO format
   * @private
   */
  standardizeDate(dateStr) {
    try {
      // Handle relative dates
      if (dateStr.match(/\b(?:today|tomorrow|yesterday|next|last)\b/i)) {
        // Convert relative to absolute based on current date
        const now = new Date();
        if (dateStr.includes("today")) return now.toISOString();
        if (dateStr.includes("tomorrow")) {
          now.setDate(now.getDate() + 1);
          return now.toISOString();
        }
        if (dateStr.includes("yesterday")) {
          now.setDate(now.getDate() - 1);
          return now.toISOString();
        }
        // Handle other relative dates...
        return null;
      }

      // Parse standard date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      console.warn("Date standardization failed for:", dateStr);
    }
    return null;
  }

  /**
   * Extract participants from text using enhanced NER-like heuristics
   * @private
   */
  extractParticipants(text) {
    const participants = new Set();

    // Known participant patterns
    const patterns = [
      // Standard name format (highly restrictive)
      /(?<!First |Last |Next |Previous |Is |Thanks |View |Happy |This |Next |Last |See |Did |Leave |Drop |Also |Has |Our |My |On |At |In |From |To |For |With |The |That |When |Where |What |Why |How |If |Then |And |But |Or )(?:[A-Z][a-z]{1,20})(?: (?:[A-Z][a-z]{1,20})){1,2}(?! (?:Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Insurance|Payment|Break|Off|Moment|Practices|Plumber|Coordinator|List|Cash|Christmas|Account|Summary|Treatment|Anniversary|Tickets|Card|Moment|Practices|Response|Payment|Fork|Request))/g,
      // Email format
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    ];

    // Known false positives to filter out
    const falsePositives = new Set([
      "First Viewed",
      "Last Viewed",
      "Message Report",
      "Family Wizard",
      "Condo Sale",
      "Health Insurance",
      "Mortgage Payment",
      "Winter Break",
      "Sound Practices",
      "Parent Coordinator",
      "Running List",
      "Apple Cash",
      "Local Hoops",
      "Capital Gains",
      "Ordinary Income",
      "Insurance Card",
      "Sunday Dec",
      "Monday Dec",
      "Tuesday Dec",
      "Wednesday Dec",
      "Thursday Dec",
      "Friday Dec",
      "Saturday Dec",
      "Next Saturday",
      "Last Thursday",
      "This Saturday",
      "Extra Mortgage",
      "Developer Weeks",
      "Breakthrough Moment",
      "Sound Practices",
      "Power Back",
      "Running List",
    ]);

    // Extract and filter participants
    patterns.forEach((pattern) => {
      const matches = text.match(pattern) || [];
      matches.forEach((match) => {
        if (!falsePositives.has(match)) {
          participants.add(match);
        }
      });
    });

    return Array.from(participants);
  }

  /**
   * Extract topics using enhanced keyword analysis
   * @private
   */
  extractTopics(text) {
    const topics = new Set();

    // Topic categories with related terms
    const topicPatterns = {
      communication:
        /\b(?:meeting|discussion|conversation|message|email|response|reply|notification|contact)\b/gi,
      planning:
        /\b(?:schedule|plan|agenda|timeline|deadline|date|appointment|upcoming|future)\b/gi,
      documentation:
        /\b(?:report|document|file|record|attachment|form|paperwork|statement)\b/gi,
      decision:
        /\b(?:decision|agreement|approval|consent|resolution|confirm|approve|accept)\b/gi,
      issue:
        /\b(?:issue|problem|concern|question|dispute|conflict|disagreement|complaint)\b/gi,
      action:
        /\b(?:action|task|todo|follow-up|review|complete|finish|handle|process)\b/gi,
      financial:
        /\b(?:payment|expense|cost|budget|fund|money|invoice|bill|fee|charge)\b/gi,
      legal:
        /\b(?:legal|court|attorney|judge|hearing|case|counsel|proceeding|motion)\b/gi,
      family:
        /\b(?:child|parent|family|guardian|custody|visitation|support)\b/gi,
      scheduling:
        /\b(?:schedule|appointment|time|date|availability|meet|session)\b/gi,
    };

    // Extract topics by category
    Object.entries(topicPatterns).forEach(([category, pattern]) => {
      const matches = text.match(pattern) || [];
      matches.forEach((match) => {
        topics.add(match.toLowerCase());
        // Add category as a higher-level topic
        topics.add(category);
      });
    });

    return Array.from(topics);
  }

  /**
   * Extract relationships from text with enhanced analysis
   * @private
   */
  extractRelationships(text, doc) {
    const participants = this.extractParticipants(text);
    const topics = this.extractTopics(text);

    // Create participant relationships
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        // Determine relationship type based on context
        let type = "mentioned_together";
        if (text.toLowerCase().includes("agree")) {
          type = "agreement";
        } else if (text.toLowerCase().includes("disput")) {
          type = "dispute";
        } else if (text.toLowerCase().includes("discuss")) {
          type = "discussion";
        }

        doc = this.addParticipantRelationship(
          doc,
          participants[i],
          participants[j],
          type
        );
      }
    }

    // Create topic relationships
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        doc = this.addTopicRelationship(doc, topics[i], topics[j], "related");
      }
    }

    return doc;
  }

  /**
   * Calculate text statistics
   * @private
   */
  calculateStatistics(text) {
    const paragraphs = text.split(/\n\s*\n/);
    const words = text.match(/\S+/g) || [];

    return {
      characters: text.length,
      words: words.length,
      paragraphs: paragraphs.length,
      average_paragraph_length:
        paragraphs.length > 0
          ? Math.round(words.length / paragraphs.length)
          : 0,
      estimated_total_tokens: Math.ceil(text.length / 4),
    };
  }

  /**
   * Identify logical sections in the text
   * @private
   */
  identifySections(text) {
    const sections = [];
    let currentHeader = "";
    let currentContent = "";

    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim() || "";

      const isHeader =
        (line.length > 0 && line.length < 100 && nextLine === "") ||
        (line === line.toUpperCase() && line.length > 3) ||
        line.match(/^\d+[\.\)]/) ||
        nextLine.match(/^[=\-_]{3,}$/);

      if (isHeader) {
        if (currentContent) {
          sections.push({
            header: currentHeader,
            content: currentContent.trim(),
          });
        }
        currentHeader = line;
        currentContent = "";
        if (nextLine.match(/^[=\-_]{3,}$/)) i++;
      } else if (line || nextLine) {
        currentContent += (currentContent ? "\n" : "") + line;
      }
    }

    if (currentContent) {
      sections.push({ header: currentHeader, content: currentContent.trim() });
    }

    return sections;
  }
}

export default new PDFProcessor();
