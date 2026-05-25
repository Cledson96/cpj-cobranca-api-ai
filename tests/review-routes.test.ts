import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { ReviewRequest, ReviewResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const validPayload: ReviewRequest = {
  code: "export function soma(a: number, b: number) { return a + b; }",
  language: "typescript",
  context: "Modulo simples",
};

const reviewResponse: ReviewResponse = {
  overall_quality: "good",
  score: 9,
  issues: [],
  positives: ["Codigo simples e legivel."],
  summary: "Sem problemas relevantes.",
};

function createApp() {
  const reviewService = {
    execute: vi.fn().mockResolvedValue(reviewResponse),
    executeStream: vi.fn().mockResolvedValue(reviewResponse),
  };

  return {
    app: buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    }),
    reviewService,
  };
}

describe("POST /api/v1/review", () => {
  it("executa review com payload valido", async () => {
    const { app, reviewService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(reviewResponse);
    expect(reviewService.execute).toHaveBeenCalledWith(validPayload);

    await app.close();
  });

  it("retorna 400 para payload invalido", async () => {
    const { app, reviewService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: {
        code: "",
        language: "typescript",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para code review.",
    });
    expect(reviewService.execute).not.toHaveBeenCalled();

    await app.close();
  });

  it("retorna 500 controlado quando service falha", async () => {
    const reviewService = {
      execute: vi.fn().mockRejectedValue(new Error("falha no provedor")),
      executeStream: vi.fn(),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: "generic_error",
      message: "falha no provedor",
    });

    await app.close();
  });
});

describe("POST /api/v1/review/stream", () => {
  it("executa stream de review com payload valido", async () => {
    const reviewService = {
      execute: vi.fn(),
      executeStream: vi.fn().mockImplementation(async (_input, onEvent) => {
        onEvent("started", { execution_id: "execution-stream-1", cache_hit: false });
        onEvent("step", { node_name: "security_agent", kind: "llm", status: "success", duration_ms: 100 });
        onEvent("result", { output: reviewResponse });
        onEvent("done", {});
        return reviewResponse;
      }),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review/stream",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");

    const body = response.body;
    expect(body).toContain("event: started");
    expect(body).toContain("event: step");
    expect(body).toContain("event: result");
    expect(body).toContain("event: done");
    expect(body).toContain("execution-stream-1");
    expect(body).toContain("security_agent");

    expect(reviewService.executeStream).toHaveBeenCalledWith(validPayload, expect.any(Function));

    await app.close();
  });

  it("retorna 400 para payload invalido no stream", async () => {
    const reviewService = {
      execute: vi.fn(),
      executeStream: vi.fn(),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review/stream",
      payload: {
        code: "",
        language: "typescript",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para stream de review.",
    });

    await app.close();
  });

  it("retorna evento de erro controlado quando stream quebra", async () => {
    const reviewService = {
      execute: vi.fn(),
      executeStream: vi.fn().mockRejectedValue(new Error("falha no modelo de IA")),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review/stream",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");

    const body = response.body;
    expect(body).toContain("event: error");
    expect(body).toContain("falha no modelo de IA");
    expect(body).toContain("event: done");

    await app.close();
  });

  it("nao duplica eventos terminais quando service ja emitiu erro e done", async () => {
    const reviewService = {
      execute: vi.fn(),
      executeStream: vi.fn().mockImplementation(async (_input, onEvent) => {
        onEvent("error", { message: "falha persistida" });
        onEvent("done", {});
        throw new Error("falha persistida");
      }),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review/stream",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);

    const eventNames = response.body
      .split("\n")
      .filter((line) => line.startsWith("event: "))
      .map((line) => line.replace("event: ", ""));

    expect(eventNames.filter((event) => event === "error")).toHaveLength(1);
    expect(eventNames.filter((event) => event === "done")).toHaveLength(1);

    await app.close();
  });
});
