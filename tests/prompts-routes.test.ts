import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type {
  PromptVersionDetail,
  PromptVersionListResponse,
  PromptVersionSummary,
} from "@shared";
import type { PromptsService } from "@/modules/prompts";
import { createTestEnv } from "./support/test-env";

const reviewPromptSummary: PromptVersionSummary = {
  flow_type: "review",
  version: 2,
  name: "Review v2",
  is_active: true,
  block_keys: [
    "aggregator",
    "complexity",
    "error_handling",
    "naming_clarity",
    "resource_leak",
    "security",
  ],
};

const reviewPromptDetail: PromptVersionDetail = {
  ...reviewPromptSummary,
  blocks: [
    {
      block_key: "security",
      system_prompt: "Voce e um especialista em seguranca.",
    },
    {
      block_key: "aggregator",
      system_prompt: "Voce consolida os achados finais.",
    },
  ],
};

function createApp(promptsService: PromptsService) {
  return buildApp({
    env: createTestEnv(),
    registerDatabase: false,
    serverOptions: { logger: false },
    dependencies: { promptsService },
  });
}

describe("PromptsRoutes", () => {
  it("lista versoes de prompt por fluxo", async () => {
    const promptsService: PromptsService = {
      list: vi.fn().mockResolvedValue({
        items: [reviewPromptSummary],
      } satisfies PromptVersionListResponse),
      findActive: vi.fn(),
      findVersion: vi.fn(),
      create: vi.fn(),
      activate: vi.fn(),
    };
    const app = createApp(promptsService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/prompts?flow_type=review",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [reviewPromptSummary],
    });
    expect(promptsService.list).toHaveBeenCalledWith({ flow_type: "review" });

    await app.close();
  });

  it("retorna a versao ativa do fluxo", async () => {
    const promptsService: PromptsService = {
      list: vi.fn(),
      findActive: vi.fn().mockResolvedValue(reviewPromptDetail),
      findVersion: vi.fn(),
      create: vi.fn(),
      activate: vi.fn(),
    };
    const app = createApp(promptsService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/prompts/review/active",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(reviewPromptDetail);
    expect(promptsService.findActive).toHaveBeenCalledWith("review");

    await app.close();
  });

  it("retorna uma versao especifica do fluxo", async () => {
    const promptsService: PromptsService = {
      list: vi.fn(),
      findActive: vi.fn(),
      findVersion: vi.fn().mockResolvedValue(reviewPromptDetail),
      create: vi.fn(),
      activate: vi.fn(),
    };
    const app = createApp(promptsService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/prompts/review/2",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(reviewPromptDetail);
    expect(promptsService.findVersion).toHaveBeenCalledWith({
      flow_type: "review",
      version: 2,
    });

    await app.close();
  });

  it("cadastra nova versao de prompt", async () => {
    const createdPrompt: PromptVersionDetail = {
      flow_type: "document",
      version: 3,
      name: "Document v3",
      is_active: false,
      block_keys: ["agent"],
      blocks: [
        {
          block_key: "agent",
          system_prompt: "Voce gera documentacao tecnica.",
        },
      ],
    };
    const promptsService: PromptsService = {
      list: vi.fn(),
      findActive: vi.fn(),
      findVersion: vi.fn(),
      create: vi.fn().mockResolvedValue(createdPrompt),
      activate: vi.fn(),
    };
    const app = createApp(promptsService);

    const payload = {
      flow_type: "document",
      name: "Document v3",
      blocks: [
        {
          block_key: "agent",
          system_prompt: "Voce gera documentacao tecnica.",
        },
      ],
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/prompts",
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(createdPrompt);
    expect(promptsService.create).toHaveBeenCalledWith(payload);

    await app.close();
  });

  it("ativa uma versao de prompt", async () => {
    const promptsService: PromptsService = {
      list: vi.fn(),
      findActive: vi.fn(),
      findVersion: vi.fn(),
      create: vi.fn(),
      activate: vi.fn().mockResolvedValue(reviewPromptDetail),
    };
    const app = createApp(promptsService);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/prompts/review/2/activate",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(reviewPromptDetail);
    expect(promptsService.activate).toHaveBeenCalledWith({
      flow_type: "review",
      version: 2,
    });

    await app.close();
  });

  it("retorna 400 para cadastro invalido", async () => {
    const promptsService: PromptsService = {
      list: vi.fn(),
      findActive: vi.fn(),
      findVersion: vi.fn(),
      create: vi.fn(),
      activate: vi.fn(),
    };
    const app = createApp(promptsService);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/prompts",
      payload: {
        flow_type: "review",
        name: "",
        blocks: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para cadastro de prompt.",
    });
    expect(promptsService.create).not.toHaveBeenCalled();

    await app.close();
  });
});
