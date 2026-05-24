import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { LLMResult } from "@langchain/core/outputs";

export class OpenRouterTelemetryCallback extends BaseCallbackHandler {
  name = "openrouter_telemetry_callback";
  private output: LLMResult | null = null;

  handleLLMEnd(output: LLMResult): void {
    this.output = output;
  }

  llmOutput(): unknown {
    return this.output?.llmOutput ?? null;
  }
}
