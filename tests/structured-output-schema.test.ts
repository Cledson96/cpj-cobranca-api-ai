import { describe, expect, it } from "vitest";
import { zodToJsonSchema } from "zod-to-json-schema";
import { specialistAgentOutputSchema } from "@/modules/review/models";
import { reviewResponseSchema } from "@shared";

describe("schemas de structured output", () => {
  it("nao gera referencias internas para propriedades em schemas enviados ao provider", () => {
    const specialistJsonSchema = JSON.stringify(
      zodToJsonSchema(specialistAgentOutputSchema, "NamingClarityAgentOutput"),
    );
    const reviewJsonSchema = JSON.stringify(
      zodToJsonSchema(reviewResponseSchema, "ReviewAggregatorOutput"),
    );

    expect(specialistJsonSchema).not.toContain("/properties/");
    expect(reviewJsonSchema).not.toContain("/properties/");
  });
});
