import { describe, expect, it } from "vitest";
import { createStructuredOutputConfig } from "@/modules/agent/llm";

describe("createStructuredOutputConfig", () => {
  it("deixa OpenRouter escolher metodo compativel com o modelo", () => {
    const config = createStructuredOutputConfig("ReviewAggregatorOutput");

    expect(config).toEqual({
      includeRaw: true,
      name: "ReviewAggregatorOutput",
      strict: true,
    });
    expect(config).not.toHaveProperty("method");
  });
});
