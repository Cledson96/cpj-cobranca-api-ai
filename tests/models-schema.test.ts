import { describe, expect, it } from "vitest";
import {
  modelCreateRequestSchema,
  modelDetailSchema,
  modelUpdateRequestSchema,
} from "@shared";

describe("model schemas", () => {
  it("valida cadastro de modelo", () => {
    const result = modelCreateRequestSchema.parse({
      name: "deepseek/deepseek-v4-flash",
    });

    expect(result).toEqual({
      name: "deepseek/deepseek-v4-flash",
    });
  });

  it("valida atualizacao parcial do modelo", () => {
    const result = modelUpdateRequestSchema.parse({
      name: "openai/gpt-4o-mini",
      is_active: true,
      is_default: false,
    });

    expect(result.is_active).toBe(true);
    expect(result.is_default).toBe(false);
  });

  it("valida detalhe de modelo", () => {
    const result = modelDetailSchema.parse({
      id: "model-1",
      name: "openai/gpt-4o-mini",
      is_active: true,
      is_default: true,
    });

    expect(result.name).toBe("openai/gpt-4o-mini");
    expect(result.is_default).toBe(true);
  });
});
