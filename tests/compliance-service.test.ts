import { describe, expect, it, vi } from "vitest";
import { ComplianceEngine, type ComplianceExecutionPersistence } from "@/modules/compliance/engines";
import { DefaultComplianceService } from "@/modules/compliance/services";
import type { ReviewExecutionRecord } from "@/modules/executions";
import { createPayloadHash, type ComplianceRequest, type ComplianceResponse } from "@shared";

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

describe("DefaultComplianceService", () => {
  it("retorna metadados da execucao persistida", async () => {
    const complianceEngine = {
      execute: vi.fn().mockResolvedValue(complianceOutput),
    } as unknown as ComplianceEngine;
    const executionRecord: ReviewExecutionRecord = {
      id: "execution-compliance-1",
      createdAt: new Date("2026-05-25T10:00:00.000Z"),
      flowType: "compliance",
      status: "success",
      inputPayload: complianceInput,
      outputPayload: complianceOutput,
      durationMs: 12,
      requestHash: createPayloadHash(complianceInput),
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    const findSuccessByHash = vi.fn().mockResolvedValue(executionRecord);
    const executionPersistence = {
      findSuccessByHash,
    } as unknown as ComplianceExecutionPersistence;
    const service = new DefaultComplianceService({ complianceEngine, executionPersistence });

    const output = await service.executeWithMetadata(complianceInput);

    expect(output).toEqual({
      output: complianceOutput,
      execution_id: "execution-compliance-1",
      cache_hit: false,
    });
    expect(complianceEngine.execute).toHaveBeenCalledWith(complianceInput);
    expect(findSuccessByHash).toHaveBeenCalledWith(createPayloadHash(complianceInput));
  });
});
