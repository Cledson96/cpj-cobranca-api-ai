import { describe, expect, it } from "vitest";
import { createOpenRouterStructuredOutputSchema } from "@/modules/agent/llm/structured-output.runner";
import { pullRequestReviewResponseSchema } from "@shared";

function collectRefs(node: unknown): string[] {
  if (!node || typeof node !== "object") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectRefs);
  }

  const record = node as Record<string, unknown>;
  const ownRef = typeof record.$ref === "string" ? [record.$ref] : [];
  return [
    ...ownRef,
    ...Object.values(record).flatMap(collectRefs),
  ];
}

describe("createOpenRouterStructuredOutputSchema", () => {
  it("remove refs internos que o response_format da OpenAI rejeita", () => {
    const schema = createOpenRouterStructuredOutputSchema(pullRequestReviewResponseSchema);

    expect(collectRefs(schema)).toEqual([]);
  });
});
