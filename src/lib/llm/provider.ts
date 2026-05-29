import { z } from "zod";

export interface LLMProvider {
  generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    fallback: T
  ): Promise<T>;
}

const MAX_RETRIES = 3;
const BACKOFF_MS = [500, 1500, 4000];

// State for Circuit Breaker
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LLMProviderAdapter implements LLMProvider {
  private provider: "mock" | "openai";
  private apiKey?: string;
  private modelName: string;

  constructor() {
    this.provider = (process.env.LLM_PROVIDER as "mock" | "openai") || "mock";
    this.apiKey = process.env.OPENAI_API_KEY;
    this.modelName = process.env.OPENAI_MODEL || "gpt-5.5";

    if (this.provider === "openai" && !this.apiKey) {
      console.warn("OPENAI_API_KEY is missing. Falling back to mock LLM provider.");
      this.provider = "mock";
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    fallback: T
  ): Promise<T> {
    if (this.provider === "mock") {
      console.log("[LLM Provider] Using mock generator...");
      return this.generateMockResponse(schema, fallback);
    }

    // Circuit Breaker Check
    if (Date.now() < circuitOpenUntil) {
      console.warn(`[LLM Provider] Circuit is OPEN until ${new Date(circuitOpenUntil).toISOString()}. Returning fallback directly.`);
      return fallback;
    }

    // Lazy load LangChain/OpenAI packages to avoid loading overhead when using mock
    const { ChatOpenAI } = await import("@langchain/openai");
    const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const model = new ChatOpenAI({
          openAIApiKey: this.apiKey,
          modelName: this.modelName,
          temperature: 0.2,
        }).withStructuredOutput(schema);

        const response = await model.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(prompt),
        ]);

        // Success: Reset circuit state
        consecutiveFailures = 0;
        return response as T;
      } catch (err) {
        console.warn(`[LLM Provider] Attempt ${i + 1} failed:`, err instanceof Error ? err.message : err);
        
        if (i === MAX_RETRIES - 1) {
          // Last retry failed: increment failure counter
          consecutiveFailures++;
          if (consecutiveFailures >= 5) {
            circuitOpenUntil = Date.now() + 600_000; // Open circuit for 10 minutes
            console.error(`[LLM Provider] 5 consecutive failures reached. Circuit is now OPEN for 10 minutes.`);
          }
          console.error("[LLM Provider] OpenAI structured output failed after max retries. Using fallback.");
          return fallback;
        }

        // Sleep with exponential backoff before retrying
        await sleep(BACKOFF_MS[i]);
      }
    }

    return fallback;
  }

  private generateMockResponse<T>(schema: z.ZodType<T>, fallback: T): T {
    return fallback;
  }
}

export const llmProvider = new LLMProviderAdapter();
