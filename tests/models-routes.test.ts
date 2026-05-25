import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type {
  ModelDetail,
  ModelListResponse,
} from "@shared";
import type { ModelsService } from "@/modules/models";
import { createTestEnv } from "./support/test-env";

const defaultModel: ModelDetail = {
  id: "model-1",
  name: "openai/gpt-4o-mini",
  is_active: true,
  is_default: true,
};

const secondaryModel: ModelDetail = {
  id: "model-2",
  name: "deepseek/deepseek-v4-flash",
  is_active: true,
  is_default: false,
};

function createApp(modelsService: ModelsService) {
  return buildApp({
    env: createTestEnv(),
    registerDatabase: false,
    serverOptions: { logger: false },
    dependencies: { modelsService },
  });
}

describe("ModelsRoutes", () => {
  it("lista modelos cadastrados", async () => {
    const modelsService: ModelsService = {
      list: vi.fn().mockResolvedValue({
        items: [defaultModel, secondaryModel],
      } satisfies ModelListResponse),
      findDefault: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      resolveRequestedModel: vi.fn(),
    };
    const app = createApp(modelsService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/models",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [defaultModel, secondaryModel],
    });
    expect(modelsService.list).toHaveBeenCalledWith();

    await app.close();
  });

  it("retorna modelo padrao global", async () => {
    const modelsService: ModelsService = {
      list: vi.fn(),
      findDefault: vi.fn().mockResolvedValue(defaultModel),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      resolveRequestedModel: vi.fn(),
    };
    const app = createApp(modelsService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/models/default",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(defaultModel);
    expect(modelsService.findDefault).toHaveBeenCalledWith();

    await app.close();
  });

  it("cadastra modelo novo", async () => {
    const modelsService: ModelsService = {
      list: vi.fn(),
      findDefault: vi.fn(),
      create: vi.fn().mockResolvedValue(secondaryModel),
      update: vi.fn(),
      delete: vi.fn(),
      resolveRequestedModel: vi.fn(),
    };
    const app = createApp(modelsService);

    const payload = { name: "deepseek/deepseek-v4-flash" };
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/models",
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(secondaryModel);
    expect(modelsService.create).toHaveBeenCalledWith(payload);

    await app.close();
  });

  it("edita modelo", async () => {
    const modelsService: ModelsService = {
      list: vi.fn(),
      findDefault: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({
        ...secondaryModel,
        name: "deepseek/deepseek-v4-flash-v2",
        is_default: true,
      }),
      delete: vi.fn(),
      resolveRequestedModel: vi.fn(),
    };
    const app = createApp(modelsService);

    const payload = {
      name: "deepseek/deepseek-v4-flash-v2",
      is_default: true,
    };
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/models/model-2",
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(modelsService.update).toHaveBeenCalledWith({
      id: "model-2",
      ...payload,
    });

    await app.close();
  });

  it("exclui modelo nao padrao", async () => {
    const modelsService: ModelsService = {
      list: vi.fn(),
      findDefault: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      resolveRequestedModel: vi.fn(),
    };
    const app = createApp(modelsService);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/models/model-2",
    });

    expect(response.statusCode).toBe(204);
    expect(modelsService.delete).toHaveBeenCalledWith("model-2");

    await app.close();
  });
});
