export const baseSchema = {
  type: "object",
  required: ["thread_id", "timeline", "relationships", "metadata"],
  properties: {
    thread_id: {
      type: "string",
      description: "Unique identifier for the document thread"
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
                description: "ISO-8601 formatted timestamp"
              },
              type: {
                type: "string",
                enum: ["message", "document", "event"],
                description: "Type of timeline event"
              },
              participants: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "List of participants involved in the event"
              },
              content: {
                type: "string",
                description: "Event content or description"
              },
              sentiment: {
                type: "number",
                minimum: -1,
                maximum: 1,
                description: "Sentiment score between -1 (negative) and 1 (positive)"
              },
              topics: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "List of topics associated with the event"
              }
            }
          }
        }
      }
    },
    relationships: {
      type: "object",
      required: ["participant_network", "topic_links"],
      properties: {
        participant_network: {
          type: "object",
          description: "Graph of relationships between participants"
        },
        topic_links: {
          type: "object",
          description: "Graph of relationships between topics"
        }
      }
    },
    metadata: {
      type: "object",
      required: ["source_file", "validation_status", "processing_timestamp"],
      properties: {
        source_file: {
          type: "string",
          description: "Original source file path or identifier"
        },
        validation_status: {
          type: "string",
          enum: ["pending", "valid", "invalid"],
          description: "Current validation status"
        },
        processing_timestamp: {
          type: "string",
          format: "date-time",
          description: "ISO-8601 formatted processing timestamp"
        }
      }
    }
  }
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
    errors: validate.errors || []
  };
};
