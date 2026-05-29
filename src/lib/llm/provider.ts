import { z } from "zod";

export interface LLMProvider {
  generateStructuredOutput<T>(
    prompt: string,
    systemPrompt: string,
    schema: z.ZodType<T>,
    fallback: T
  ): Promise<T>;
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

    try {
      // Lazy load LangChain/OpenAI packages to avoid loading overhead when using mock
      const { ChatOpenAI } = await import("@langchain/openai");
      const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");

      const model = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName: this.modelName,
        temperature: 0.2,
      }).withStructuredOutput(schema);

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt),
      ]);

      return response as T;
    } catch (err) {
      console.error("[LLM Provider] OpenAI structured output failed. Using fallback.", err);
      return fallback;
    }
  }

  private generateMockResponse<T>(schema: z.ZodType<T>, fallback: T): T {
    // Return fallback since it is structured correctly
    return fallback;
  }
}

export const llmProvider = new LLMProviderAdapter();
