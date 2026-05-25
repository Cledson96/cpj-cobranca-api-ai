import { describe, expect, it } from "vitest";
import { DefaultModelsService } from "@/modules/models";
import type { ModelsRepository } from "@/modules/models";

function createRepositoryStub(overrides: Partial<ModelsRepository> = {}): ModelsRepository {
  return {
    list: async () => [],
    findById: async () => null,
    findByName: async () => null,
    findDefault: async () => null,
    create: async () => {
      throw new Error("not implemented");
    },
    update: async () => {
      throw new Error("not implemented");
    },
    delete: async () => undefined,
    setDefault: async () => {
      throw new Error("not implemented");
    },
    ...overrides,
  };
}

describe("DefaultModelsService", () => {
  it("rejeita cadastro duplicado", async () => {
    const service = new DefaultModelsService(createRepositoryStub({
      findByName: async () => ({
        id: "model-1",
        name: "openai/gpt-4o-mini",
        is_active: true,
        is_default: true,
      }),
    }));

    await expect(service.create({ name: "openai/gpt-4o-mini" })).rejects.toThrow("ja cadastrado");
  });

  it("bloqueia exclusao do modelo padrao global", async () => {
    const service = new DefaultModelsService(createRepositoryStub({
      findById: async () => ({
        id: "model-1",
        name: "openai/gpt-4o-mini",
        is_active: true,
        is_default: true,
      }),
    }));

    await expect(service.delete("model-1")).rejects.toThrow("padrao global");
  });

  it("rejeita request com modelo inativo", async () => {
    const service = new DefaultModelsService(createRepositoryStub({
      findByName: async () => ({
        id: "model-2",
        name: "deepseek/deepseek-v4-flash",
        is_active: false,
        is_default: false,
      }),
    }));

    await expect(service.resolveRequestedModel("deepseek/deepseek-v4-flash")).rejects.toThrow("inativo");
  });

  it("usa modelo padrao global quando request nao informa override", async () => {
    const service = new DefaultModelsService(createRepositoryStub({
      findDefault: async () => ({
        id: "model-1",
        name: "openai/gpt-4o-mini",
        is_active: true,
        is_default: true,
      }),
    }));

    await expect(service.resolveRequestedModel()).resolves.toBe("openai/gpt-4o-mini");
  });
});
