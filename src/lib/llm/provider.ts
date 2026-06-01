import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Purpose-based model routing.
 * Each purpose maps to a separate env var for model selection.
 */
export type ModelPurpose = "forecast" | "rewrite" | "safety";

export interface LLMProvider {
  generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    fallback: T,
    purpose?: ModelPurpose
  ): Promise<T>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BACKOFF_MS = [500, 1500, 4000];

// State for Circuit Breaker
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Supported provider keys
// ---------------------------------------------------------------------------

type ProviderKey = "mock" | "openai" | "google" | "anthropic";

/**
 * Resolve which concrete provider & model to use for a given purpose.
 *
 * Routing rules:
 *   - 'forecast' → primary model (LLM_PROVIDER / OPENAI_MODEL)
 *   - 'rewrite'  → REWRITE_MODEL env var (falls back to primary)
 *   - 'safety'   → SAFETY_MODEL env var (falls back to primary)
 *
 * The model string may include a provider prefix:
 *   e.g. "google:gemini-2.5-flash" or "anthropic:claude-sonnet-4-20250514"
 *   If no prefix, the default provider is used.
 */
function resolveProviderAndModel(
  purpose: ModelPurpose,
  defaultProvider: ProviderKey,
  defaultModel: string,
): { provider: ProviderKey; model: string } {
  let modelSpec: string | undefined;

  switch (purpose) {
    case "rewrite":
      modelSpec = process.env.REWRITE_MODEL;
      break;
    case "safety":
      modelSpec = process.env.SAFETY_MODEL;
      break;
    case "forecast":
    default:
      break;
  }

  // If no override, use defaults
  if (!modelSpec) {
    return { provider: defaultProvider, model: defaultModel };
  }

  // Check for provider prefix "provider:model"
  const colonIdx = modelSpec.indexOf(":");
  if (colonIdx > 0) {
    const providerPrefix = modelSpec.slice(0, colonIdx).toLowerCase() as ProviderKey;
    const model = modelSpec.slice(colonIdx + 1);
    if (["openai", "google", "anthropic"].includes(providerPrefix)) {
      return { provider: providerPrefix, model };
    }
  }

  // No prefix → use with default provider
  return { provider: defaultProvider, model: modelSpec };
}

// ---------------------------------------------------------------------------
// Provider-specific invocation helpers
// ---------------------------------------------------------------------------

async function invokeOpenAI<T>(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const { ChatOpenAI } = await import("@langchain/openai");
  const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");

  const llm = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: model,
    temperature: 0.2,
  }).withStructuredOutput(schema);

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt),
  ]);

  return response as T;
}

async function invokeGoogle<T>(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  // @ts-ignore — optional dependency, only loaded when Google provider is configured
  const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
  const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");

  const llm = new ChatGoogleGenerativeAI({
    apiKey,
    model,
    temperature: 0.2,
  }).withStructuredOutput(schema);

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt),
  ]);

  return response as T;
}

async function invokeAnthropic<T>(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  // @ts-ignore — optional dependency, only loaded when Anthropic provider is configured
  const { ChatAnthropic } = await import("@langchain/anthropic");
  const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");

  const llm = new ChatAnthropic({
    anthropicApiKey: apiKey,
    model,
    temperature: 0.2,
  }).withStructuredOutput(schema);

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt),
  ]);

  return response as T;
}

// ---------------------------------------------------------------------------
// Main adapter
// ---------------------------------------------------------------------------

export class LLMProviderAdapter implements LLMProvider {
  private defaultProvider: ProviderKey;
  private defaultModel: string;

  // API keys (resolved once at construction)
  private openaiKey?: string;
  private googleKey?: string;
  private anthropicKey?: string;

  constructor() {
    this.defaultProvider = (process.env.LLM_PROVIDER as ProviderKey) || "mock";
    this.defaultModel = process.env.OPENAI_MODEL || "gpt-5.5";

    // Collect API keys
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.googleKey = process.env.GOOGLE_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Validate default provider has a key
    if (this.defaultProvider === "openai" && !this.openaiKey) {
      console.warn("OPENAI_API_KEY is missing. Falling back to mock LLM provider.");
      this.defaultProvider = "mock";
    }
    if (this.defaultProvider === "google" && !this.googleKey) {
      console.warn("GOOGLE_API_KEY is missing. Falling back to mock LLM provider.");
      this.defaultProvider = "mock";
    }
    if (this.defaultProvider === "anthropic" && !this.anthropicKey) {
      console.warn("ANTHROPIC_API_KEY is missing. Falling back to mock LLM provider.");
      this.defaultProvider = "mock";
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    fallback: T,
    purpose: ModelPurpose = "forecast",
  ): Promise<T> {
    // Resolve which provider & model to use for this purpose
    const { provider, model } = resolveProviderAndModel(
      purpose,
      this.defaultProvider,
      this.defaultModel,
    );

    if (provider === "mock") {
      console.log(`[LLM Provider] Using mock generator (purpose: ${purpose})...`);
      return this.generateMockResponse(schema, fallback);
    }

    // Verify the resolved provider has a valid API key
    const apiKey = this.getApiKey(provider);
    if (!apiKey) {
      console.warn(
        `[LLM Provider] No API key for provider "${provider}" (purpose: ${purpose}). Using fallback.`,
      );
      return fallback;
    }

    // Circuit Breaker Check
    if (Date.now() < circuitOpenUntil) {
      console.warn(
        `[LLM Provider] Circuit is OPEN until ${new Date(circuitOpenUntil).toISOString()}. Returning fallback directly.`,
      );
      return fallback;
    }

    console.log(
      `[LLM Provider] Invoking ${provider}/${model} (purpose: ${purpose})...`,
    );

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await this.invokeProvider<T>(
          provider,
          apiKey,
          model,
          prompt,
          systemPrompt,
          schema,
        );

        // Success: Reset circuit state
        consecutiveFailures = 0;
        return response;
      } catch (err) {
        console.warn(
          `[LLM Provider] Attempt ${i + 1} failed (${provider}/${model}):`,
          err instanceof Error ? err.message : err,
        );

        if (i === MAX_RETRIES - 1) {
          // Last retry failed: increment failure counter
          consecutiveFailures++;
          if (consecutiveFailures >= 5) {
            circuitOpenUntil = Date.now() + 600_000; // Open circuit for 10 minutes
            console.error(
              `[LLM Provider] 5 consecutive failures reached. Circuit is now OPEN for 10 minutes.`,
            );
          }
          console.error(
            `[LLM Provider] ${provider} structured output failed after max retries. Using fallback.`,
          );
          return fallback;
        }

        // Sleep with exponential backoff before retrying
        await sleep(BACKOFF_MS[i]);
      }
    }

    return fallback;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getApiKey(provider: ProviderKey): string | undefined {
    switch (provider) {
      case "openai":
        return this.openaiKey;
      case "google":
        return this.googleKey;
      case "anthropic":
        return this.anthropicKey;
      default:
        return undefined;
    }
  }

  private async invokeProvider<T>(
    provider: ProviderKey,
    apiKey: string,
    model: string,
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    switch (provider) {
      case "openai":
        return invokeOpenAI(apiKey, model, prompt, systemPrompt, schema);
      case "google":
        return invokeGoogle(apiKey, model, prompt, systemPrompt, schema);
      case "anthropic":
        return invokeAnthropic(apiKey, model, prompt, systemPrompt, schema);
      default:
        throw new Error(`[LLM Provider] Unsupported provider: ${provider}`);
    }
  }

  private generateMockResponse<T>(schema: z.ZodType<T>, fallback: T): T {
    return fallback;
  }
}

export const llmProvider = new LLMProviderAdapter();
