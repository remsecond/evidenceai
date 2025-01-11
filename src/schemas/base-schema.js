export const baseSchema = {
  type: "object",
  required: ["thread_id", "timeline", "relationships", "metadata"],
  properties: {
    thread_id: {
      type: "string",
      description: "Unique identifier for the document thread",
    },
    timeline: {
      type: "object",
      required: ["events"],
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            required: ["timestamp", "type", "content"],
            properties: {
              timestamp: {
                type: "string",
                format: "date-time",
                description: "ISO-8601 formatted timestamp",
              },
              type: {
                type: "string",
                enum: ["message", "document", "event", "summary", "section"],
                description: "Type of timeline event",
              },
              key_points: {
                type: "array",
                items: {
                  type: "object",
                  required: ["type", "content"],
                  properties: {
                    type: {
                      type: "string",
                      enum: ["decisions", "actions", "deadlines", "disputes"],
                      description: "Type of key point",
                    },
                    content: {
                      type: "string",
                      description: "Content of the key point",
                    },
                  },
                },
                description: "List of key points extracted from the content",
              },
              dates: {
                type: "array",
                items: {
                  type: "object",
                  required: ["original", "iso", "type"],
                  properties: {
                    original: {
                      type: "string",
                      description: "Original date string from text",
                    },
                    iso: {
                      type: "string",
                      format: "date-time",
                      description: "ISO-8601 formatted date",
                    },
                    type: {
                      type: "string",
                      enum: ["explicit", "relative"],
                      description: "Type of date reference",
                    },
                  },
                },
                description: "List of dates extracted from the content",
              },
              annotations: {
                type: "object",
                properties: {
                  primary_type: {
                    type: "string",
                    enum: ["general", "legal", "financial", "parenting"],
                    description: "Primary type of content",
                  },
                  importance: {
                    type: "string",
                    enum: ["normal", "high"],
                    description: "Importance level of content",
                  },
                  context: {
                    type: ["string", "null"],
                    description: "Additional context for the content",
                  },
                  ambiguities: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["type", "context"],
                      properties: {
                        type: {
                          type: "string",
                          enum: ["needs_clarification"],
                          description: "Type of ambiguity",
                        },
                        context: {
                          type: "string",
                          description: "Context around the ambiguity",
                        },
                      },
                    },
                    description: "List of ambiguities in the content",
                  },
                  tags: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description: "Content tags",
                  },
                },
                description: "Content annotations and metadata",
              },
              participants: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of participants involved in the event",
              },
              content: {
                type: "string",
                description: "Event content or description",
              },
              sentiment: {
                type: "number",
                minimum: -1,
                maximum: 1,
                description:
                  "Sentiment score between -1 (negative) and 1 (positive)",
              },
              topics: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of topics associated with the event",
              },
              source_file: {
                type: "string",
                description: "Source file for this event",
              },
              metadata: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    description: "Event metadata type",
                  },
                  importance: {
                    type: "string",
                    enum: ["normal", "high"],
                    description: "Event importance",
                  },
                },
              },
            },
          },
        },
      },
    },
    relationships: {
      type: "object",
      required: ["participant_network", "topic_links"],
      properties: {
        participant_network: {
          type: "object",
          description: "Graph of relationships between participants",
        },
        topic_links: {
          type: "object",
          description: "Graph of relationships between topics",
        },
      },
    },
    metadata: {
      type: "object",
      required: ["validation_status", "processing_timestamp"],
      properties: {
        task: {
          type: "object",
          properties: {
            objective: {
              type: "string",
              description: "Processing task objective",
            },
            sample_queries: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Example queries for this task",
            },
            domain_terminology: {
              type: "object",
              description: "Domain-specific term mappings",
            },
          },
        },
        pdf_info: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "PDF file path",
              },
              pages: {
                type: "number",
                description: "Number of pages",
              },
              version: {
                type: ["string", "null"],
                description: "PDF version",
              },
              info: {
                type: "object",
                description: "PDF metadata",
              },
            },
          },
        },
        statistics: {
          type: "object",
          properties: {
            per_document: {
              type: "array",
              items: {
                type: "object",
              },
            },
            totals: {
              type: "object",
              properties: {
                characters: {
                  type: "number",
                },
                words: {
                  type: "number",
                },
                paragraphs: {
                  type: "number",
                },
                estimated_total_tokens: {
                  type: "number",
                },
                average_paragraph_length: {
                  type: "number",
                },
                documents_processed: {
                  type: "number",
                },
              },
            },
          },
        },
        cross_references: {
          type: "object",
          properties: {
            participant_overlaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  participant: {
                    type: "string",
                  },
                  documents: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
            },
            topic_overlaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: {
                    type: "string",
                  },
                  documents: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
            },
            date_overlaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                  },
                  documents: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
            },
            key_point_overlaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key_point: {
                    type: "string",
                  },
                  documents: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        validation_status: {
          type: "string",
          enum: ["pending", "valid", "invalid"],
          description: "Current validation status",
        },
        processing_meta: {
          type: "object",
          properties: {
            timestamp: {
              type: "string",
              format: "date-time",
            },
            version: {
              type: "string",
            },
            processing_time_ms: {
              type: "number",
            },
            files_processed: {
              type: "number",
            },
          },
        },
      },
    },
  },
};

import Ajv from "ajv";
import addFormats from "ajv-formats";

export const validateBaseSchema = (data) => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv); // Add support for date-time format
  const validate = ajv.compile(baseSchema);
  const valid = validate(data);

  return {
    isValid: valid,
    errors: validate.errors || [],
  };
};
