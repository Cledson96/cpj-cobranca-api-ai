import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

export function toOpenApiSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(schema, {
    target: "openApi3",
    $refStrategy: "none",
  });

  if (!isRecord(jsonSchema)) {
    return {};
  }

  return jsonSchema;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
