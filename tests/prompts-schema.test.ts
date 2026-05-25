import { describe, expect, it } from "vitest";
import {
  promptBlockKeySchema,
  promptVersionCreateRequestSchema,
  promptVersionDetailSchema,
  promptVersionListQuerySchema,
} from "@shared";

describe("prompt schemas", () => {
  it("valida cadastro de versao com blocos", () => {
    const result = promptVersionCreateRequestSchema.parse({
      flow_type: "review",
      name: "Review v2",
      blocks: [
        {
          block_key: "security",
          system_prompt: "Voce e especialista em seguranca.",
        },
        {
          block_key: "aggregator",
          system_prompt: "Voce consolida a revisao.",
        },
      ],
    });

    expect(result.flow_type).toBe("review");
    expect(result.blocks).toHaveLength(2);
  });

  it("valida query de listagem por fluxo", () => {
    const result = promptVersionListQuerySchema.parse({
      flow_type: "document",
    });

    expect(result).toEqual({ flow_type: "document" });
  });

  it("mantem o enum de blocos suportados", () => {
    expect(promptBlockKeySchema.parse("agent")).toBe("agent");
    expect(promptBlockKeySchema.parse("security")).toBe("security");
    expect(() => promptBlockKeySchema.parse("unknown")).toThrow();
  });

  it("valida o detalhe de uma versao persistida", () => {
    const result = promptVersionDetailSchema.parse({
      flow_type: "tests",
      version: 1,
      name: "Tests v1",
      is_active: true,
      block_keys: ["agent"],
      blocks: [
        {
          block_key: "agent",
          system_prompt: "Voce gera testes.",
        },
      ],
    });

    expect(result.version).toBe(1);
    expect(result.blocks[0]?.block_key).toBe("agent");
  });
});
