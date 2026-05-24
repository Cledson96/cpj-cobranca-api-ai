import { describe, expect, it, vi } from "vitest";
import { ReviewExecutionRepository } from "@/modules/executions/repositories/review-execution.repository";
import type { ReviewRequest, ReviewResponse } from "@shared";

const createdAt = new Date("2026-05-24T15:30:45.000Z");

const reviewInput: ReviewRequest = {
  code: "export function soma(a: number, b: number) { return a + b; }",
  language: "typescript",
  context: "Modulo simples",
};

const reviewOutput: ReviewResponse = {
  overall_quality: "good",
  score: 9,
  issues: [],
  positives: ["Codigo simples e legivel."],
  summary: "Sem problemas relevantes.",
};

function createRepository() {
  const prisma = {
    execution: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    prisma,
    repository: new ReviewExecutionRepository(prisma),
  };
}

describe("ReviewExecutionRepository", () => {
  it("cria execucao pendente para review", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.create.mockResolvedValue({
      id: "execution-1",
      createdAt,
      flowType: "review",
      status: "pending",
      inputPayload: reviewInput,
      outputPayload: null,
      durationMs: 0,
      requestHash: "hash-1",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    });

    const execution = await repository.createPending({
      inputPayload: reviewInput,
      requestHash: "hash-1",
    });

    expect(execution.id).toBe("execution-1");
    expect(prisma.execution.create).toHaveBeenCalledWith({
      data: {
        flowType: "review",
        status: "pending",
        inputPayload: reviewInput,
        requestHash: "hash-1",
      },
    });
  });

  it("marca execucao de review como sucesso", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.update.mockResolvedValue({
      id: "execution-1",
      createdAt,
      flowType: "review",
      status: "success",
      inputPayload: reviewInput,
      outputPayload: reviewOutput,
      durationMs: 1200,
      requestHash: "hash-1",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    });

    const execution = await repository.markSuccess({
      id: "execution-1",
      outputPayload: reviewOutput,
      durationMs: 1200,
    });

    expect(execution.status).toBe("success");
    expect(prisma.execution.update).toHaveBeenCalledWith({
      where: { id: "execution-1", flowType: "review" },
      data: {
        status: "success",
        outputPayload: reviewOutput,
        durationMs: 1200,
        errorMessage: null,
      },
    });
  });

  it("marca execucao de review como falha", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.update.mockResolvedValue({
      id: "execution-1",
      createdAt,
      flowType: "review",
      status: "failed",
      inputPayload: reviewInput,
      outputPayload: null,
      durationMs: 300,
      requestHash: "hash-1",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: "OPENROUTER_API_KEY nao configurada",
    });

    const execution = await repository.markFailed({
      id: "execution-1",
      errorMessage: "OPENROUTER_API_KEY nao configurada",
      durationMs: 300,
    });

    expect(execution.status).toBe("failed");
    expect(prisma.execution.update).toHaveBeenCalledWith({
      where: { id: "execution-1", flowType: "review" },
      data: {
        status: "failed",
        outputPayload: undefined,
        durationMs: 300,
        errorMessage: "OPENROUTER_API_KEY nao configurada",
      },
    });
  });

  it("busca detalhe de execucao por id", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.findUnique.mockResolvedValue({
      id: "execution-1",
      createdAt,
      flowType: "review",
      status: "success",
      inputPayload: reviewInput,
      outputPayload: reviewOutput,
      durationMs: 1200,
      requestHash: "hash-1",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    });

    const detail = await repository.findById("execution-1");

    expect(detail).toEqual({
      id: "execution-1",
      type: "review",
      status: "success",
      timestamp: "2026-05-24T12:30:45-03:00",
      duration_ms: 1200,
      cache_hit: false,
      source_execution_id: null,
      input_payload: reviewInput,
      output_payload: reviewOutput,
      error_message: null,
    });
  });

  it("lista as ultimas execucoes de review", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.findMany.mockResolvedValue([
      {
        id: "execution-1",
        createdAt,
        flowType: "review",
        status: "success",
        durationMs: 1200,
        cacheHit: true,
        sourceExecutionId: "execution-0",
      },
    ]);

    const items = await repository.listLatest(20);

    expect(items).toEqual([
      {
        id: "execution-1",
        type: "review",
        status: "success",
        timestamp: "2026-05-24T12:30:45-03:00",
        duration_ms: 1200,
        cache_hit: true,
        source_execution_id: "execution-0",
      },
    ]);
    expect(prisma.execution.findMany).toHaveBeenCalledWith({
      where: { flowType: "review" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        flowType: true,
        status: true,
        durationMs: true,
        cacheHit: true,
        sourceExecutionId: true,
      },
    });
  });
});
