import fs from "fs";
import path from "path";
import crypto from "crypto";
import yaml from "js-yaml";

export interface PromptRegistryEntry {
  prompt_id: string;
  version: string;
  file: string;
  purpose?: string;
  model_role?: string;
  input_schema?: string;
  output_schema?: string;
  safety_class?: string;
  golden_tests?: string[];
  status?: string;
}

export interface PromptVersion {
  name: string;
  version: string;
  contentHash: string;
  file: string;
  purpose: string;
  output_schema: string;
  content: string;
  loadedAt: string;
}

const DEFAULT_REGISTRY_ENTRIES: PromptRegistryEntry[] = [
  {
    prompt_id: "system",
    version: "0.2.0",
    file: "prompts/system.md",
    purpose: "global_instruction",
    output_schema: "none",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "concept_canonicalizer",
    version: "0.2.0",
    file: "prompts/concept_canonicalizer.md",
    purpose: "forecast",
    output_schema: "ConceptStateSchema",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "risk_vectorizer",
    version: "0.2.0",
    file: "prompts/risk_vectorizer.md",
    purpose: "forecast",
    output_schema: "RiskVectorSchema",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "policy_binder",
    version: "0.2.0",
    file: "prompts/policy_binder.md",
    purpose: "forecast",
    output_schema: "ActionPolicySchema",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "forecast_writer",
    version: "0.2.0",
    file: "prompts/forecast_writer.md",
    purpose: "forecast",
    output_schema: "ForecastOutputSchema",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "safety_reviewer",
    version: "0.2.0",
    file: "prompts/safety_reviewer.md",
    purpose: "safety",
    output_schema: "SafetyReviewOutputSchema",
    safety_class: "S3",
    status: "active",
  },
  {
    prompt_id: "run_receipt_summarizer",
    version: "0.2.0",
    file: "prompts/run_receipt_summarizer.md",
    purpose: "forecast",
    output_schema: "RecompositionSummarySchema",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "eval_judge",
    version: "0.2.0",
    file: "prompts/eval_judge.md",
    purpose: "safety",
    output_schema: "EvalJudgeRubricSchema",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "vibe_rewriter",
    version: "0.2.0",
    file: "prompts/vibe_rewriter.md",
    purpose: "rewrite",
    output_schema: "VibeRewriterOutputSchema",
    safety_class: "S1",
    status: "active",
  },
  {
    prompt_id: "vibe_estimator",
    version: "0.2.0",
    file: "prompts/vibe_estimator.md",
    purpose: "forecast",
    output_schema: "VibeCheckInSchema",
    safety_class: "S1",
    status: "active",
  },
];

let cachedRegistry: Map<string, PromptRegistryEntry> | null = null;
const promptCache = new Map<string, PromptVersion>();

/**
 * Parse `prompts/registry.yaml` using `js-yaml` as the canonical source of prompt metadata.
 * Falls back to built-in defaults if file read or YAML parse fails.
 */
export function getPromptRegistry(): Map<string, PromptRegistryEntry> {
  if (cachedRegistry) return cachedRegistry;

  const map = new Map<string, PromptRegistryEntry>();
  for (const entry of DEFAULT_REGISTRY_ENTRIES) {
    map.set(entry.prompt_id, entry);
  }

  try {
    const registryPath = path.join(process.cwd(), "prompts", "registry.yaml");
    const rawYaml = fs.readFileSync(registryPath, "utf-8");
    const parsed = yaml.load(rawYaml) as { prompts?: PromptRegistryEntry[] } | null;
    if (parsed && Array.isArray(parsed.prompts)) {
      for (const entry of parsed.prompts) {
        if (entry && entry.prompt_id) {
          map.set(entry.prompt_id, {
            ...map.get(entry.prompt_id),
            ...entry,
            purpose: entry.purpose || entry.model_role || "forecast",
            output_schema: entry.output_schema || "none",
          });
        }
      }
    }
  } catch {
    // Fallback to DEFAULT_REGISTRY_ENTRIES already populated in `map`
  }

  cachedRegistry = map;
  return map;
}

export function getPromptMetadata(name: string): PromptRegistryEntry | undefined {
  return getPromptRegistry().get(name);
}

/**
 * Load a prompt file registered in `prompts/registry.yaml` with metadata & content-based hash.
 * Returns a cached copy when the file hasn't changed.
 * Falls back to built-in defaults if the file is missing.
 */
export function loadPrompt(name: string): PromptVersion {
  const registry = getPromptRegistry();
  const meta = registry.get(name);
  const relativeFile = meta?.file || `prompts/${name}.md`;
  const filePath = path.isAbsolute(relativeFile)
    ? relativeFile
    : path.join(process.cwd(), relativeFile);

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    const defaults: Record<string, string> = {
      system: "You are TCO-Vibe Fortune Coach.",
      forecast_writer: "",
      lifetime_fortune_writer: "",
    };
    content = defaults[name] || "";
  }

  const contentHash = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex")
    .substring(0, 12);

  const semanticVersion = meta?.version ? `${meta.version}+${contentHash}` : contentHash;

  const cached = promptCache.get(name);
  if (cached && cached.contentHash === contentHash) return cached;

  const prompt: PromptVersion = {
    name,
    version: semanticVersion,
    contentHash,
    file: relativeFile,
    purpose: meta?.purpose || meta?.model_role || "forecast",
    output_schema: meta?.output_schema || "none",
    content,
    loadedAt: new Date().toISOString(),
  };

  promptCache.set(name, prompt);
  return prompt;
}

/**
 * Return a snapshot of all prompt versions currently loaded in the cache.
 * Useful for embedding into RunReceipt / API responses for traceability.
 */
export function getPromptVersions(): Record<string, string> {
  const versions: Record<string, string> = {};
  promptCache.forEach((v, k) => {
    versions[k] = v.version;
  });
  return versions;
}
