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
   * Process one or more PDF files into our base document structure
   * @param {string|string[]} filePaths - Path(s) to the PDF file(s)
   * @param {Object} options - Processing options
   * @param {string} options.taskObjective - Clear description of processing goal
   * @param {string[]} options.sampleQueries - Example queries to guide processing
   * @param {Object} options.domainTerminology - Domain-specific term mappings
   * @returns {Promise<Object>} Processed document in base format
   */
  async processPdf(filePaths, options = {}) {
    try {
      logger.info(
        "Starting PDF processing:",
        Array.isArray(filePaths) ? filePaths.join(", ") : filePaths
      );
      const startTime = Date.now();

      // Handle single file or array of files
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

      // Create base document
      let doc = this.createBaseDocument(paths[0]); // Use first file as primary

      // Add task-specific metadata
      doc.metadata.task = {
        objective: options.taskObjective || "General document processing",
        sample_queries: options.sampleQueries || [],
        domain_terminology: options.domainTerminology || {},
      };

      // Process each file
      const allPdfData = await Promise.all(
        paths.map(async (path) => {
          // Get file stats
          const stats = fs.statSync(path);
          const fileInfo = {
            path: path,
            size_bytes: stats.size,
            size_mb: (stats.size / (1024 * 1024)).toFixed(2),
            created: stats.birthtime,
            modified: stats.mtime,
          };

          // Read and parse PDF
          const dataBuffer = fs.readFileSync(path);
          const pdfData = await pdfParse(dataBuffer, { max: 0 });

          return {
            path,
            fileInfo,
            pdfData,
            text: pdfData.text,
          };
        })
      );

      // Process all documents
      for (const pdfData of allPdfData) {
        // Process content into timeline events
        const sections = this.identifySections(pdfData.text);

        // Create document summary section
        doc = this.addTimelineEvent(doc, {
          type: "summary",
          content: "Document Summary",
          source_file: pdfData.path,
          key_points: this.extractKeyPoints(pdfData.text),
          participants: this.extractParticipants(pdfData.text),
          topics: this.extractTopics(pdfData.text),
          metadata: {
            type: "document_summary",
            importance: "high",
          },
        });

        // Process each section
        for (const section of sections) {
          // Create section header with table summary
          const summary = this.createSectionSummary(section);
          doc = this.addTimelineEvent(doc, {
            type: "section",
            content: summary,
            source_file: pdfData.path,
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
      }

      // Cross-reference and consolidate insights
      doc = this.crossReferenceDocuments(doc, allPdfData);

      // Add consolidated metadata
      doc.metadata = {
        ...doc.metadata,
        pdf_info: allPdfData.map((pdf) => ({
          path: pdf.path,
          pages: pdf.pdfData.numpages,
          version: pdf.pdfData.pdfInfo?.PDFFormatVersion,
          info: pdf.pdfData.info,
        })),
        statistics: this.calculateCombinedStatistics(allPdfData),
        processing_meta: {
          timestamp: new Date().toISOString(),
          version: "1.0",
          processing_time_ms: Date.now() - startTime,
          files_processed: allPdfData.length,
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

    // First, check for email headers
    const emailHeaderPattern =
      /^(?:From|To|Cc|Bcc):\s*([^<\n]+)?(?:<([^>]+)>)?/gim;
    let match;
    while ((match = emailHeaderPattern.exec(text)) !== null) {
      if (match[1]) participants.add(match[1].trim());
      if (match[2]) participants.add(match[2].trim());
    }

    // Known participant patterns for body text
    const patterns = [
      // Standard name format (highly restrictive)
      /(?<!First |Last |Next |Previous |Is |Thanks |View |Happy |This |Next |Last |See |Did |Leave |Drop |Also |Has |Our |My |On |At |In |From |To |For |With |The |That |When |Where |What |Why |How |If |Then |And |But |Or |Date |Subject |Re: |Fw: |Fwd: )(?:[A-Z][a-z]{1,20})(?: (?:[A-Z][a-z]{1,20})){1,2}(?! (?:Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Insurance|Payment|Break|Off|Moment|Practices|Plumber|Coordinator|List|Cash|Christmas|Account|Summary|Treatment|Anniversary|Tickets|Card|Moment|Practices|Response|Payment|Fork|Request|Sent|Received|Subject|Message|Report|Round|Truth))/g,
      // Email format (not in headers)
      /(?<!From:|To:|Cc:|Bcc:)\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    ];

    // Known false positives to filter out
    const falsePositives = new Set([
      // Email/System Terms
      "First Viewed",
      "Last Viewed",
      "Message Report",
      "Family Wizard",
      "Date Sent",
      "Date Received",
      "Subject Line",
      "Message Body",
      "Email Thread",
      "Reply All",
      "Forward Message",
      "Original Message",
      "Quick Reply",
      "Read Receipt",
      "Mail Delivery",
      "System Administrator",
      "Help Desk",
      "Support Team",
      "Auto Reply",
      "Client Portal",

      // Time/Date References
      "On Monday",
      "On Tuesday",
      "On Wednesday",
      "On Thursday",
      "On Friday",
      "On Saturday",
      "On Sunday",
      "On Mon",
      "On Tue",
      "On Wed",
      "On Thu",
      "On Fri",
      "On Sat",
      "On Sun",
      "Next Week",
      "Last Week",
      "This Week",
      "Next Month",
      "Last Month",
      "This Month",
      "Next Year",
      "Last Year",

      // Products/Items
      "Snow Blower",
      "Bean Bag",
      "Green Egg",
      "Beach Couch",
      "Power Supply",
      "Mini Microwave",
      "Small Microwave",
      "Study Frame",
      "Dining Table",
      "Electric Bikes",
      "Black Bike",
      "Pellet Grill",
      "Electric Smoker",
      "Telsa Charger",
      "Clothes Hangers",
      "Sonos Soundbar",

      // Locations/Organizations
      "Hong Kong",
      "Kirkland Ave",
      "Spring St",
      "Union St",
      "Granada Blvd",
      "Ormond Beach",
      "Brand Blvd",
      "Seattle Academy",
      "Amazon Appstore",
      "Washington State",
      "King County",
      "Sammamish High",
      "Home Court",

      // Generic Terms
      "Good Morning",
      "Good Evening",
      "Hi There",
      "Hey Guys",
      "Thank You",
      "Touch Base",
      "Get Outlook",
      "Powered By",
      "Privacy Policy",
      "Account Overview",
      "User Name",
      "App Name",
      "Standard Price",
      "New Year",
      "Spring Break",
      "Winter Break",
      "Family Introduction",
      "Contact Info",
      "Board Certified",
      "Private Practice",
    ]);

    // Extract and filter participants
    patterns.forEach((pattern) => {
      const matches = text.match(pattern) || [];
      matches.forEach((match) => {
        const name = match.trim();
        if (!falsePositives.has(name) && name.length > 0) {
          participants.add(name);
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

    // Create participant relationships only for real participants (not system entities)
    const realParticipants = participants.filter((p) => {
      // Skip emails
      if (p.includes("@")) return false;

      // Skip system/header terms
      if (
        p.match(
          /^(Date|Subject|Message|System|Auto|Help|Support|Account|User|App|Privacy|Contact)/
        )
      ) {
        return false;
      }

      // Skip time/date references
      if (
        p.match(
          /^(On|Next|Last|This) (Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Week|Month|Year)/
        )
      ) {
        return false;
      }

      // Skip generic greetings/phrases
      if (
        p.match(
          /^(Good|Hi|Hey|Hello|Thank|Touch|Get|New|Board|Private|Happy|Dear) [A-Z][a-z]+$/
        )
      ) {
        return false;
      }

      // Skip titles, roles, and honorifics
      if (
        p.match(
          /^(Dr|Mr|Mrs|Ms|Prof|Director|President|Vice|Board|Member|Chairman|CEO|Manager|Coach|Administrator|Assistant|Supervisor|Leader|Head|Chief|Officer|Executive|Principal|Dean|Coordinator) /
        )
      ) {
        return false;
      }

      // Skip product/service names and descriptions
      if (
        p.match(
          /^[A-Z][a-z]+ (Stuff|Blower|Bag|Egg|Couch|Supply|Microwave|Frame|Table|Bikes?|Grill|Smoker|Charger|Hangers|Soundbar|Services|Solutions|Systems|Products|Equipment|Recommendations|Therapy|Psychology|Counseling|Education|Training|Support|Access|Behavior|Schedule|Plan|Report|List|Notes|Info|Alert|Confirmation|Transfer|Status|Overview|Summary)$/
        )
      ) {
        return false;
      }

      // Skip organization names and types
      if (
        p.match(
          /^[A-Z][a-z]+ (Inc|LLC|Corp|Corporation|Foundation|Association|Institute|Center|Group|Team|Company|Realty|Agency|Clinic|Hospital|Services|Solutions|Partners|Consultants|Advisors|International|Global|National|Regional|Local|Office|Division|Department|Branch|Unit)$/
        )
      ) {
        return false;
      }

      // Skip location/building names and types
      if (
        p.match(
          /^[A-Z][a-z]+ (Ave|St|Blvd|Beach|County|State|Court|Academy|High|School|University|College|Building|Center|Plaza|Park|Mall|Road|Drive|Lane|Circle|Square|Heights|Gardens|Place|Point|Ridge|Hills|Valley|Springs|Woods|Estates|Commons|District|Zone|Area|Region)$/
        )
      ) {
        return false;
      }

      // Skip compound phrases and descriptive combinations
      if (
        p.match(
          /^[A-Z][a-z]+ (And|Or|Of|For|To|From|With|By|In|On|At|Up|Down|Out|Over|Under|Through|Into|Onto|About|After|Before|During|Without|Within|Between|Among|Around|Behind|Beside|Beyond|Toward) [A-Z][a-z]+$/
        )
      ) {
        return false;
      }

      // Skip system messages and status indicators
      if (
        p.match(
          /^(Order|Payment|Transfer|Account|User|System|Status|Alert|Notification|Confirmation|Report|Summary|Overview|Update|Error|Warning|Success|Info|Help|Support) /
        )
      ) {
        return false;
      }

      // Skip time-based phrases
      if (
        p.match(
          /^(Morning|Afternoon|Evening|Night|Today|Tomorrow|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December) /
        )
      ) {
        return false;
      }

      // Accept only proper names with 2-3 parts, where each part is properly capitalized
      const parts = p.split(" ");
      return (
        parts.length >= 2 &&
        parts.length <= 3 &&
        parts.every((part) => part.match(/^[A-Z][a-z]{1,20}$/)) &&
        !parts.some((part) =>
          part.match(/^(The|And|Or|Of|For|To|From|With|By|In|On|At)$/)
        )
      );
    });

    // Create participant relationships
    for (let i = 0; i < realParticipants.length; i++) {
      for (let j = i + 1; j < realParticipants.length; j++) {
        // Determine relationship type based on context
        let type = "mentioned_together";
        const context = text.toLowerCase();
        if (
          context.includes("agree") ||
          context.includes("approve") ||
          context.includes("accept")
        ) {
          type = "agreement";
        } else if (
          context.includes("disput") ||
          context.includes("disagree") ||
          context.includes("object")
        ) {
          type = "dispute";
        } else if (
          context.includes("discuss") ||
          context.includes("conversation") ||
          context.includes("meeting")
        ) {
          type = "discussion";
        }

        doc = this.addParticipantRelationship(
          doc,
          realParticipants[i],
          realParticipants[j],
          type
        );
      }
    }

    // Create topic relationships only between meaningful topics
    const meaningfulTopics = topics.filter(
      (t) =>
        !t.match(/^(general|misc|other)$/) && // Skip generic topics
        t.length > 3 // Skip very short terms
    );

    // Create topic relationships
    for (let i = 0; i < meaningfulTopics.length; i++) {
      for (let j = i + 1; j < meaningfulTopics.length; j++) {
        doc = this.addTopicRelationship(
          doc,
          meaningfulTopics[i],
          meaningfulTopics[j],
          "related"
        );
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

  /**
   * Create a structured summary for a section
   * @private
   */
  createSectionSummary(section) {
    // Extract key information
    const keyPoints = this.extractKeyPoints(section.content);
    const participants = this.extractParticipants(section.content);
    const topics = this.extractTopics(section.content);
    const dates = this.extractDates(section.content);

    // Create table-style summary
    const summary = [
      `## ${section.header || "Untitled Section"}`,
      "",
      "### Key Points",
      ...keyPoints.map((point) => `- [${point.type}] ${point.content}`),
      "",
      "### Participants",
      ...participants.map((p) => `- ${p}`),
      "",
      "### Topics",
      ...topics.map((t) => `- ${t}`),
      "",
      "### Timeline",
      ...dates.map((d) => `- ${d.original} (${d.iso})`),
      "",
      "### Content Preview",
      section.content.substring(0, 200) + "...",
      "",
    ].join("\n");

    return summary;
  }

  /**
   * Cross-reference and consolidate insights across documents
   * @private
   */
  crossReferenceDocuments(doc, allPdfData) {
    // Track overlapping content
    const overlaps = {
      participants: new Map(), // participant -> [documents]
      topics: new Map(), // topic -> [documents]
      dates: new Map(), // date -> [documents]
      keyPoints: new Map(), // key point -> [documents]
    };

    // Analyze each document
    allPdfData.forEach((pdfData) => {
      // Extract all entities
      const participants = this.extractParticipants(pdfData.text);
      const topics = this.extractTopics(pdfData.text);
      const dates = this.extractDates(pdfData.text);
      const keyPoints = this.extractKeyPoints(pdfData.text);

      // Track document overlaps
      const trackOverlap = (map, items, doc) => {
        items.forEach((item) => {
          if (!map.has(item)) map.set(item, new Set());
          map.get(item).add(doc);
        });
      };

      trackOverlap(overlaps.participants, participants, pdfData.path);
      trackOverlap(overlaps.topics, topics, pdfData.path);
      trackOverlap(
        overlaps.dates,
        dates.map((d) => d.iso),
        pdfData.path
      );
      trackOverlap(
        overlaps.keyPoints,
        keyPoints.map((k) => k.content),
        pdfData.path
      );
    });

    // Add cross-reference metadata
    doc.metadata.cross_references = {
      participant_overlaps: Array.from(overlaps.participants.entries())
        .filter(([_, docs]) => docs.size > 1)
        .map(([participant, docs]) => ({
          participant,
          documents: Array.from(docs),
        })),
      topic_overlaps: Array.from(overlaps.topics.entries())
        .filter(([_, docs]) => docs.size > 1)
        .map(([topic, docs]) => ({
          topic,
          documents: Array.from(docs),
        })),
      date_overlaps: Array.from(overlaps.dates.entries())
        .filter(([_, docs]) => docs.size > 1)
        .map(([date, docs]) => ({
          date,
          documents: Array.from(docs),
        })),
      key_point_overlaps: Array.from(overlaps.keyPoints.entries())
        .filter(([_, docs]) => docs.size > 1)
        .map(([keyPoint, docs]) => ({
          key_point: keyPoint,
          documents: Array.from(docs),
        })),
    };

    return doc;
  }

  /**
   * Calculate combined statistics across multiple documents
   * @private
   */
  calculateCombinedStatistics(allPdfData) {
    // Initialize totals
    const totals = {
      characters: 0,
      words: 0,
      paragraphs: 0,
      estimated_total_tokens: 0,
    };

    // Calculate per-document stats and aggregate
    const documentStats = allPdfData.map((pdf) => {
      const stats = this.calculateStatistics(pdf.text);
      totals.characters += stats.characters;
      totals.words += stats.words;
      totals.paragraphs += stats.paragraphs;
      totals.estimated_total_tokens += stats.estimated_total_tokens;
      return {
        path: pdf.path,
        ...stats,
      };
    });

    return {
      per_document: documentStats,
      totals: {
        ...totals,
        average_paragraph_length:
          totals.paragraphs > 0
            ? Math.round(totals.words / totals.paragraphs)
            : 0,
        documents_processed: allPdfData.length,
      },
    };
  }
}

export default new PDFProcessor();
