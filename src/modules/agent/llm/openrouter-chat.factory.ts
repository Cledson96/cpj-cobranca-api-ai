import { ChatOpenRouter } from "@langchain/openrouter";
import { GenericError } from "@/infrastructure/errors";
import { type AppEnv, loadEnv } from "@shared";

export class OpenRouterChatFactory {
  constructor(private readonly env: AppEnv = loadEnv()) {}

  create(): ChatOpenRouter {
    if (!this.env.OPENROUTER_API_KEY) {
      throw new GenericError("OPENROUTER_API_KEY nao configurada para executar o agente de review.");
    }

    this.configureLangSmithTracing();

    return new ChatOpenRouter({
      apiKey: this.env.OPENROUTER_API_KEY,
      model: this.env.OPENROUTER_DEFAULT_MODEL,
      siteName: this.env.OPENROUTER_APP_TITLE,
      siteUrl: this.env.OPENROUTER_SITE_URL,
      temperature: 0,
    });
  }

  private configureLangSmithTracing(): void {
    process.env.LANGSMITH_TRACING = this.env.LANGSMITH_TRACING ? "true" : "false";
    process.env.LANGSMITH_PROJECT = this.env.LANGSMITH_PROJECT;

    if (this.env.LANGSMITH_API_KEY) {
      process.env.LANGSMITH_API_KEY = this.env.LANGSMITH_API_KEY;
    }
  }
}
