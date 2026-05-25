import { describe, expect, it, vi } from "vitest";
import { AgentExecutionRepository } from "@/modules/executions";
import type { ComplianceRequest, ComplianceResponse } from "@shared";

const createdAt = new Date("2026-05-24T15:30:45.000Z");

const complianceInput: ComplianceRequest = {
  task_description: "Permitir renegociacao apenas para contratos ativos e registrar auditoria.",
  code: "if (contract.active) { renegotiate(contract); audit(contract.id); }",
  language: "typescript",
};

const complianceOutput: ComplianceResponse = {
  compliant: false,
  compliance_score: 70,
  covered_requirements: ["Valida contrato ativo antes da renegociacao."],
  missing_requirements: ["Nao garante auditoria para toda renegociacao."],
  partial_requirements: [],
  verdict: "Parcialmente aderente.",
};

function createRepository() {
  const prisma = {
    execution: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    executionStep: {
      create: vi.fn(),
    },
    executionTelemetry: {
      upsert: vi.fn(),
    },
  };

  return {
    prisma,
    repository: new AgentExecutionRepository<ComplianceRequest, ComplianceResponse>(prisma, "compliance"),
  };
}

describe("AgentExecutionRepository", () => {
  it("cria execucao pendente para o fluxo configurado", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.create.mockResolvedValue({
      id: "execution-1",
      createdAt,
      flowType: "compliance",
      status: "pending",
      inputPayload: complianceInput,
      outputPayload: null,
      durationMs: 0,
      requestHash: "hash-compliance-1",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    });

    const execution = await repository.createPending({
      inputPayload: complianceInput,
      requestHash: "hash-compliance-1",
    });

    expect(execution.flowType).toBe("compliance");
    expect(prisma.execution.create).toHaveBeenCalledWith({
      data: {
        flowType: "compliance",
        status: "pending",
        inputPayload: complianceInput,
        requestHash: "hash-compliance-1",
      },
    });
  });

  it("filtra cache pelo fluxo configurado", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.findMany.mockResolvedValue([
      {
        id: "execution-1",
        createdAt,
        flowType: "compliance",
        status: "success",
        inputPayload: complianceInput,
        outputPayload: complianceOutput,
        durationMs: 1000,
        requestHash: "same-hash",
        cacheHit: false,
        sourceExecutionId: null,
        errorMessage: null,
      },
    ]);

    const execution = await repository.findSuccessByHash("same-hash");

    expect(execution?.flowType).toBe("compliance");
    expect(prisma.execution.findMany).toHaveBeenCalledWith({
      where: {
        flowType: "compliance",
        status: "success",
        requestHash: "same-hash",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
  });

  it("cria cache hit para o fluxo configurado", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.create.mockResolvedValue({
      id: "execution-cache-1",
      createdAt,
      flowType: "compliance",
      status: "success",
      inputPayload: complianceInput,
      outputPayload: complianceOutput,
      durationMs: 4,
      requestHash: "same-hash",
      cacheHit: true,
      sourceExecutionId: "execution-1",
      errorMessage: null,
    });

    const execution = await repository.createCacheHit({
      inputPayload: complianceInput,
      requestHash: "same-hash",
      sourceExecutionId: "execution-1",
      outputPayload: complianceOutput,
      durationMs: 4,
    });

    expect(execution.cacheHit).toBe(true);
    expect(prisma.execution.create).toHaveBeenCalledWith({
      data: {
        flowType: "compliance",
        status: "success",
        inputPayload: complianceInput,
        outputPayload: complianceOutput,
        requestHash: "same-hash",
        cacheHit: true,
        sourceExecutionId: "execution-1",
        durationMs: 4,
      },
    });
  });
});
