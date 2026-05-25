import { describe, expect, it } from "vitest";
import { DefaultPromptsService } from "@/modules/prompts";
import type { PromptVersionRepository } from "@/modules/prompts";

function createRepositoryStub(overrides: Partial<PromptVersionRepository> = {}): PromptVersionRepository {
  return {
    list: async () => [],
    findActive: async () => null,
    findVersion: async () => null,
    create: async () => {
      throw new Error("not implemented");
    },
    activate: async () => null,
    getNextVersion: async () => 1,
    ...overrides,
  };
}

describe("DefaultPromptsService", () => {
  it("rejeita criacao de review sem todos os blocos obrigatorios", async () => {
    const service = new DefaultPromptsService(createRepositoryStub());

    await expect(service.create({
      flow_type: "review",
      name: "Review incompleto",
      blocks: [
        { block_key: "security", system_prompt: "Seguranca" },
        { block_key: "aggregator", system_prompt: "Agregador" },
      ],
    })).rejects.toThrow("Prompt de review incompleto");
  });

  it("rejeita ativacao de fluxo simples sem bloco agent", async () => {
    const service = new DefaultPromptsService(createRepositoryStub({
      findVersion: async () => ({
        flow_type: "document",
        version: 2,
        name: "Document quebrado",
        is_active: false,
        blocks: [
          { block_key: "security", system_prompt: "Nao deveria existir aqui" },
        ],
      }),
    }));

    await expect(service.activate({
      flow_type: "document",
      version: 2,
    })).rejects.toThrow("Fluxo document exige apenas o bloco agent.");
  });

  it("resolve review por versao explicita", async () => {
    const service = new DefaultPromptsService(createRepositoryStub({
      findVersion: async (input) => ({
        flow_type: input.flow_type,
        version: input.version,
        name: "Review v4",
        is_active: false,
        blocks: [
          { block_key: "naming_clarity", system_prompt: "naming" },
          { block_key: "error_handling", system_prompt: "errors" },
          { block_key: "resource_leak", system_prompt: "resource" },
          { block_key: "complexity", system_prompt: "complexity" },
          { block_key: "security", system_prompt: "security" },
          { block_key: "aggregator", system_prompt: "aggregator" },
        ],
      }),
    }));

    const result = await service.resolveReview(4);

    expect(result.security).toBe("security");
    expect(result.aggregator).toBe("aggregator");
  });

  it("resolve fluxo simples pela versao ativa quando prompt_version nao vem na requisicao", async () => {
    const service = new DefaultPromptsService(createRepositoryStub({
      findActive: async () => ({
        flow_type: "tests",
        version: 1,
        name: "Tests v1",
        is_active: true,
        blocks: [
          { block_key: "agent", system_prompt: "template de testes" },
        ],
      }),
    }));

    const result = await service.resolveTests();

    expect(result).toEqual({
      agent: "template de testes",
    });
  });
});
