import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PromptVersion {
  name: string;
  version: string; // SHA-256 hash of content (first 12 hex chars)
  content: string;
  loadedAt: string;
}

const promptCache = new Map<string, PromptVersion>();

/**
 * Load a prompt file from `prompts/{name}.md` with content-based versioning.
 * Returns a cached copy when the file hasn't changed (same SHA-256 prefix).
 * Falls back to built-in defaults if the file is missing.
 */
export function loadPrompt(name: string): PromptVersion {
  const cached = promptCache.get(name);

  const filePath = path.join(process.cwd(), 'prompts', `${name}.md`);
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    // Fallback defaults when the prompt file does not exist
    const defaults: Record<string, string> = {
      system: 'You are TCO-Vibe Fortune Coach.',
      forecast_writer: '',
      lifetime_fortune_writer: '',
    };
    content = defaults[name] || '';
  }

  const version = crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 12);

  // Return cached entry if content hash has not changed
  if (cached && cached.version === version) return cached;

  const prompt: PromptVersion = {
    name,
    version,
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
