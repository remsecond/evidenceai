import fs from "fs";
import path from "path";

/**
 * Base document processor that implements core processing principles
 * before model-specific formatting
 */
class BaseProcessor {
  constructor() {
    // Core settings from CHUNKING.md
    this.maxInputSize = 150000; // tokens
    this.reservedOutput = 50000; // tokens
    this.overlapSize = 0.1; // 10% overlap
    this.contextWindow = 1000; // tokens
  }

  /**
   * Pre-process content according to pipeline principles
   */
  async preProcess(content) {
    // Basic preprocessing
    const normalized = this.normalizeContent(content);
    const metadata = this.extractMetadata(content);
    const structure = this.preserveStructure(content);

    // Enhanced preprocessing
    const patterns = await this.detectPatterns(normalized);
    const temporal = await this.analyzeTemporal(normalized);
    const sentiment = await this.analyzeSentiment(normalized);
    const participants = await this.extractParticipants(normalized);
    const dates = await this.extractDates(normalized);
    const references = await this.validateReferences(structure.references);

    return {
      normalized,
      metadata: {
        ...metadata,
        patterns,
        temporal,
        sentiment,
        participants,
        dates,
        references,
      },
      structure,
    };
  }

  /**
   * Detect content patterns
   */
  async detectPatterns(content) {
    const patterns = [];

    // Check for recurring themes
    const themes = new Map();
    const themeMatches = content.match(/\b\w+(?:\s+\w+){2,3}\b/g) || [];
    themeMatches.forEach((theme) => {
      themes.set(theme, (themes.get(theme) || 0) + 1);
    });

    themes.forEach((count, theme) => {
      if (count > 3) {
        patterns.push({
          type: "recurring_theme",
          theme,
          occurrences: count,
          confidence: Math.min(count / 10, 0.9),
        });
      }
    });

    return patterns;
  }

  /**
   * Analyze temporal aspects
   */
  async analyzeTemporal(content) {
    try {
      const extractedDates = await this.extractDates(content);
      if (
        !extractedDates ||
        !Array.isArray(extractedDates) ||
        extractedDates.length === 0
      ) {
        return {
          date_range: null,
          significant_gaps: [],
          total_dates: 0,
        };
      }

      // Sort dates chronologically
      const dates = [...extractedDates].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      // Analyze time gaps
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        const gap = new Date(dates[i].date) - new Date(dates[i - 1].date);
        const avgGap =
          (new Date(dates[dates.length - 1].date) - new Date(dates[0].date)) /
          (dates.length - 1);

        if (Math.abs(gap - avgGap) > avgGap * 2) {
          gaps.push({
            start: dates[i - 1].date,
            end: dates[i].date,
            gap_days: Math.floor(gap / (1000 * 60 * 60 * 24)),
          });
        }
      }

      return {
        date_range:
          dates.length > 0
            ? {
                start: dates[0].date,
                end: dates[dates.length - 1].date,
              }
            : null,
        significant_gaps: gaps,
        total_dates: dates.length,
      };
    } catch (error) {
      console.error("Error in analyzeTemporal:", error);
      return {
        date_range: null,
        significant_gaps: [],
        total_dates: 0,
        error: error.message,
      };
    }
  }

  /**
   * Basic sentiment analysis
   */
  async analyzeSentiment(content) {
    const sections = content.split(/\n\n+/);
    const sectionSentiments = sections.map((section) => {
      const words = section.toLowerCase().split(/\W+/);
      let score = 0;
      let wordCount = 0;

      words.forEach((word) => {
        if (word.length > 2) {
          if (/good|great|excellent|happy|positive|agree|success/i.test(word))
            score++;
          if (/bad|poor|negative|disagree|fail|wrong|angry/i.test(word))
            score--;
          wordCount++;
        }
      });

      return wordCount > 0 ? score / wordCount : 0;
    });

    return {
      overall:
        sectionSentiments.reduce((sum, score) => sum + score, 0) /
        sectionSentiments.length,
      sections: sectionSentiments,
      shifts: this.detectSentimentShifts(sectionSentiments),
    };
  }

  /**
   * Detect significant sentiment shifts
   */
  detectSentimentShifts(sentiments) {
    const shifts = [];
    for (let i = 1; i < sentiments.length; i++) {
      const change = sentiments[i] - sentiments[i - 1];
      if (Math.abs(change) > 0.5) {
        shifts.push({
          position: i,
          magnitude: change,
          from: sentiments[i - 1],
          to: sentiments[i],
        });
      }
    }
    return shifts;
  }

  /**
   * Extract participants from content
   */
  async extractParticipants(content) {
    const participants = new Map();

    // Extract email addresses
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = content.match(emailPattern) || [];

    emails.forEach((email) => {
      if (!participants.has(email)) {
        participants.set(email, {
          email,
          name: this.extractNameFromEmail(email),
          mentions: 1,
        });
      } else {
        const participant = participants.get(email);
        participant.mentions++;
      }
    });

    return Array.from(participants.values());
  }

  /**
   * Extract name from email
   */
  extractNameFromEmail(email) {
    const username = email.split("@")[0];
    return username
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Extract dates from content
   */
  async extractDates(content) {
    try {
      const dates = [];
      const datePatterns = [
        // ISO format: 2024-01-15
        {
          pattern: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
          parse: (match) => {
            const [_, year, month, day] = match;
            return new Date(year, month - 1, day);
          },
        },
        // US format: 1/15/24 or 01/15/2024
        {
          pattern: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
          parse: (match) => {
            const [_, month, day, year] = match;
            const fullYear = year.length === 2 ? "20" + year : year;
            return new Date(fullYear, month - 1, day);
          },
        },
        // Written format: January 15, 2024
        {
          pattern:
            /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{4}\b/g,
          parse: (match) => new Date(match[0]),
        },
      ];

      for (const { pattern, parse } of datePatterns) {
        const matches = Array.from(content.matchAll(pattern));
        for (const match of matches) {
          try {
            const date = parse(match);
            if (date && !isNaN(date.getTime())) {
              dates.push({
                date: date.toISOString().split("T")[0],
                original: match[0],
                context: content
                  .substring(
                    Math.max(0, match.index - 50),
                    Math.min(content.length, match.index + match[0].length + 50)
                  )
                  .trim(),
                confidence: 1.0,
              });
            }
          } catch (error) {
            console.warn("Failed to parse date:", match[0], error.message);
          }
        }
      }

      return dates;
    } catch (error) {
      console.error("Error in extractDates:", error);
      return [];
    }
  }

  /**
   * Validate cross-references
   */
  async validateReferences(references) {
    const validatedRefs = new Map();

    references.forEach((positions, ref) => {
      validatedRefs.set(ref, {
        reference: ref,
        positions,
        type: this.determineReferenceType(ref),
        valid: positions.length > 0,
      });
    });

    return Array.from(validatedRefs.values());
  }

  /**
   * Determine reference type
   */
  determineReferenceType(ref) {
    if (/^\d+$/.test(ref)) return "numeric";
    if (/^[A-Za-z][\w\s-]*$/.test(ref)) return "named";
    if (ref.includes(":")) return "labeled";
    return "other";
  }

  /**
   * Normalize content format
   * - Clean special characters
   * - Standardize line endings
   * - Remove duplicate whitespace
   */
  normalizeContent(content) {
    return content
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "") // Remove control chars
      .replace(/\r\n/g, "\n") // Standardize line endings
      .replace(/[ \t]+/g, " ") // Normalize whitespace
      .replace(/\n{3,}/g, "\n\n"); // Max double line breaks
  }

  /**
   * Extract and preserve metadata
   */
  extractMetadata(content) {
    const metadata = {
      structure: {
        sections: [],
        headers: [],
        paragraphs: 0,
      },
      statistics: {
        characters: content.length,
        estimated_tokens: Math.ceil(content.length / 4),
        lines: content.split("\n").length,
      },
      context: {
        document_type: this.detectDocumentType(content),
        language: this.detectLanguage(content),
        formatting: this.detectFormatting(content),
      },
    };

    // Track section boundaries
    const sections = content.split(/(?=\n[A-Z][^a-z\n]{3,}:)/);
    metadata.structure.sections = sections.map((section) => {
      const lines = section.split("\n");
      return {
        header: lines[0]?.trim() || "",
        length: section.length,
        estimated_tokens: Math.ceil(section.length / 4),
      };
    });

    return metadata;
  }

  /**
   * Preserve document structure
   */
  preserveStructure(content) {
    const structure = {
      sections: [],
      hierarchy: [],
      references: new Map(),
    };

    // Track section hierarchy
    let currentLevel = 0;
    content.split("\n").forEach((line) => {
      if (this.isHeader(line)) {
        const level = this.getHeaderLevel(line);
        structure.hierarchy.push({
          level,
          text: line.trim(),
          position: structure.sections.length,
        });
        currentLevel = level;
      }

      // Track cross-references
      const references = this.extractReferences(line);
      references.forEach((ref) => {
        if (!structure.references.has(ref)) {
          structure.references.set(ref, []);
        }
        structure.references.get(ref).push(structure.sections.length);
      });

      structure.sections.push({
        text: line,
        level: currentLevel,
        has_references: references.length > 0,
      });
    });

    return structure;
  }

  /**
   * Detect document type based on content patterns
   */
  detectDocumentType(content) {
    if (content.includes("Subject:") && content.includes("From:")) {
      return "email";
    }
    if (content.includes("OFW Messages Report")) {
      return "ofw_report";
    }
    return "general";
  }

  /**
   * Detect primary language (simplified)
   */
  detectLanguage(content) {
    // Basic detection - extend as needed
    return "en";
  }

  /**
   * Detect document formatting
   */
  detectFormatting(content) {
    return {
      has_headers: /\n[A-Z][^a-z\n]{3,}:/.test(content),
      has_lists: /\n[\s-]*•/.test(content),
      has_tables: /\|[\s-]+\|/.test(content),
      has_code_blocks: /```[\s\S]+?```/.test(content),
    };
  }

  /**
   * Check if line is a header
   */
  isHeader(line) {
    return (
      /^[A-Z][^a-z\n]{3,}:/.test(line) || // ALL CAPS:
      /^#{1,6}\s/.test(line) || // Markdown
      /^[A-Z][\w\s]{3,}$/.test(line) // Title Case
    );
  }

  /**
   * Get header level (0-5)
   */
  getHeaderLevel(line) {
    if (/^#{1,6}\s/.test(line)) {
      return line.match(/^(#{1,6})\s/)[1].length - 1;
    }
    if (/^[A-Z][^a-z\n]{3,}:/.test(line)) {
      return 0;
    }
    if (/^[A-Z][\w\s]{3,}$/.test(line)) {
      return 1;
    }
    return 5;
  }

  /**
   * Extract cross-references from line
   */
  extractReferences(line) {
    const references = [];
    // Match common reference patterns
    const patterns = [
      /\b(?:see|ref|reference):\s+([^,.]+)/gi,
      /\(([^)]+)\)/g,
      /\[[^\]]+\]/g,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        references.push(match[1] || match[0]);
      }
    });

    return references;
  }
}

export default BaseProcessor;
