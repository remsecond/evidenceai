import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// First, install pdf-parse
try {
  execSync("npm install pdf-parse", { stdio: "inherit" });
} catch (error) {
  console.error("Failed to install pdf-parse:", error);
  process.exit(1);
}

// Dynamic import for pdf-parse since it's installed at runtime
const pdfParse = (await import("pdf-parse")).default;

// Configure pdf-parse to not look for test files
process.env.PDF_TEST_SKIP = "true";

// Import processors
import pdfProcessor from "../src/services/pdf-processor.js";
import deepseekProcessor from "../src/services/models/deepseek-processor.js";

// Model processor mapping
const modelProcessors = {
  deepseek: deepseekProcessor,
  base: pdfProcessor,
};

// Process OFW file using proper chunking
export async function processOFWNow(pdfPath, model = "deepseek") {
  try {
    // Create output directories optimized for different model focuses
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseDir = path.join(
      process.cwd(),
      "ai-outputs",
      model,
      `ofw-processing-${timestamp}`
    );

    // Create directories for each model focus
    const notebookDir = path.join(baseDir, "notebook");
    const llmDir = path.join(baseDir, "llm");
    const rawDir = path.join(baseDir, "raw");

    [baseDir, notebookDir, llmDir, rawDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Select processor
    const processor = modelProcessors[model] || modelProcessors.base;
    if (!modelProcessors[model]) {
      console.error(`Unknown model: ${model}. Using base processor.`);
    }

    console.log("Processing PDF with enhanced chunking...");
    const result = await processor.processPdf(pdfPath);

    // Save raw outputs
    console.log("Saving raw outputs...");
    fs.writeFileSync(
      path.join(rawDir, "extracted-text.txt"),
      result.raw_content.text
    );

    result.raw_content.chunks.forEach((chunk, index) => {
      fs.writeFileSync(
        path.join(rawDir, `chunk-${index + 1}.json`),
        JSON.stringify(
          {
            text: chunk.text,
            metadata: chunk.metadata,
            estimated_tokens: chunk.estimated_tokens,
          },
          null,
          2
        )
      );
    });

    // Save NotebookLM-optimized outputs
    console.log("Generating NotebookLM outputs...");
    const metadata = {
      timestamp: new Date().toISOString(),
      file_info: result.file_info,
      structure: result.raw_content.structure,
      statistics: result.statistics,
    };

    const context = {
      sections: result.raw_content.chunks.map((chunk) => ({
        type: chunk.metadata.type,
        section: chunk.metadata.section,
        annotations: {
          continues: chunk.metadata.continues,
          part: chunk.metadata.part,
          total_parts: chunk.metadata.total_parts,
        },
      })),
    };

    const relationships = {
      document_structure: result.raw_content.structure,
      section_connections: result.raw_content.chunks.map((chunk) => ({
        section: chunk.metadata.section,
        connects_to: chunk.metadata.continues
          ? `chunk-${chunk.metadata.position + 2}`
          : null,
      })),
    };

    fs.writeFileSync(
      path.join(notebookDir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    fs.writeFileSync(
      path.join(notebookDir, "context.json"),
      JSON.stringify(context, null, 2)
    );

    fs.writeFileSync(
      path.join(notebookDir, "relationships.json"),
      JSON.stringify(relationships, null, 2)
    );

    // Save LLM-optimized outputs
    console.log("Generating LLM outputs...");
    const threadSummaries = {
      total_chunks: result.raw_content.chunks.length,
      summaries: result.raw_content.chunks.map((chunk) => ({
        section: chunk.metadata.section,
        estimated_tokens: chunk.estimated_tokens,
        continues: chunk.metadata.continues,
      })),
    };

    const sentimentAnalysis = {
      document_level: {
        total_words: result.statistics.words,
        total_paragraphs: result.statistics.paragraphs,
        average_paragraph_length: result.statistics.average_paragraph_length,
      },
      chunk_level: result.raw_content.chunks.map((chunk) => ({
        section: chunk.metadata.section,
        type: chunk.metadata.type,
      })),
    };

    const issueAnalysis = {
      processing_meta: result.processing_meta,
      structure_analysis: {
        total_chunks: result.statistics.chunks,
        average_chunk_size: result.statistics.average_chunk_size,
        estimated_total_tokens: result.statistics.estimated_total_tokens,
      },
    };

    fs.writeFileSync(
      path.join(llmDir, "thread_summaries.json"),
      JSON.stringify(threadSummaries, null, 2)
    );

    fs.writeFileSync(
      path.join(llmDir, "sentiment_analysis.json"),
      JSON.stringify(sentimentAnalysis, null, 2)
    );

    fs.writeFileSync(
      path.join(llmDir, "issue_analysis.json"),
      JSON.stringify(issueAnalysis, null, 2)
    );

    // Create final report with output structure
    const finalReport = {
      timestamp: new Date().toISOString(),
      file_info: result.file_info,
      structure: result.raw_content.structure,
      statistics: result.statistics,
      processing_meta: result.processing_meta,
      output_structure: {
        raw: {
          path: rawDir,
          files: ["extracted-text.txt", ...Array.from({length: result.raw_content.chunks.length}, (_, i) => `chunk-${i + 1}.json`)]
        },
        notebook: {
          path: notebookDir,
          files: ["metadata.json", "context.json", "relationships.json"]
        },
        llm: {
          path: llmDir,
          files: ["thread_summaries.json", "sentiment_analysis.json", "issue_analysis.json"]
        }
      }
    };

    console.log("Processing complete!");
    return finalReport;
  } catch (error) {
    console.error("Error:", error);
    fs.writeFileSync(
      path.join(baseDir, "error.log"),
      `${error.message}\n${error.stack}`
    );
    throw error;
  }
}

// Run it if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("Starting OFW processing...");
  processOFWNow(process.argv[2])
    .then((finalReport) => {
      console.log("Success! Report:", JSON.stringify(finalReport, null, 2));
      fs.writeFileSync(
        path.join(baseDir, "success.log"),
        JSON.stringify(finalReport, null, 2)
      );
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}
