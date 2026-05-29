import { readFileSync } from "fs";
import path from "path";

/**
 * Prompt Loader
 * 
 * Loads prompt markdown files from the prompts/ directory at the project root.
 * Caches loaded prompts in-memory to avoid repeated filesystem reads.
 * 
 * Server-side only (uses Node.js fs module).
 */

const promptCache = new Map<string, string>();

/**
 * Map of known prompt names to their file paths relative to prompts/ directory.
 * Matches the prompt_id values in prompts/registry.yaml.
 */
const PROMPT_FILE_MAP: Record<string, string> = {
  system: "system.md",
  concept_canonicalizer: "concept_canonicalizer.md",
  risk_vectorizer: "risk_vectorizer.md",
  policy_binder: "policy_binder.md",
  forecast_writer: "forecast_writer.md",
  safety_reviewer: "safety_reviewer.md",
  run_receipt_summarizer: "run_receipt_summarizer.md",
};

/**
 * Load a prompt markdown file by name.
 * 
 * @param name - The prompt identifier (e.g. "forecast_writer", "system")
 * @returns The raw markdown content of the prompt file
 * @throws Error if the prompt name is unknown or the file cannot be read
 */
export function loadPrompt(name: string): string {
  // Return from cache if available
  const cached = promptCache.get(name);
  if (cached) {
    return cached;
  }

  const fileName = PROMPT_FILE_MAP[name];
  if (!fileName) {
    throw new Error(
      `[PromptLoader] Unknown prompt name: "${name}". ` +
      `Available prompts: ${Object.keys(PROMPT_FILE_MAP).join(", ")}`
    );
  }

  const promptPath = path.join(process.cwd(), "prompts", fileName);

  try {
    const content = readFileSync(promptPath, "utf-8");
    promptCache.set(name, content);
    return content;
  } catch (err) {
    throw new Error(
      `[PromptLoader] Failed to read prompt file at ${promptPath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Clear the prompt cache. Useful for testing or hot-reloading prompts.
 */
export function clearPromptCache(): void {
  promptCache.clear();
}
