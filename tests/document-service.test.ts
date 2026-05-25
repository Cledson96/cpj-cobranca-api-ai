import { describe, expect, it, vi } from "vitest";
import { DefaultDocumentService } from "@/modules/document/services";
import type { DocumentExecutionPersistence } from "@/modules/document/engines";
import type { ReviewExecutionRecord } from "@/modules/executions";
import { createPayloadHash, type DocumentRequest, type DocumentResponse } from "@shared";

const documentInput: DocumentRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
  doc_type: "technical",
};

const documentOutput: DocumentResponse = {
  doc_type: "technical",
  title: "Cobranca",
  description: "Documenta cobranca.",
  inputs: [],
  outputs: [],
  side_effects: [],
  usage_example: "charge(100)",
  notes: null,
};

describe("DefaultDocumentService", () => {
  it("delega execucao para o DocumentEngine configurado", async () => {
    const documentEngine = {
      execute: vi.fn().mockResolvedValue(documentOutput),
    };
    const service = new DefaultDocumentService({ documentEngine });

    const output = await service.execute(documentInput);

    expect(output).toEqual(documentOutput);
    expect(documentEngine.execute).toHaveBeenCalledWith(documentInput);
  });

  it("retorna metadados da execucao persistida", async () => {
    const documentEngine = {
      execute: vi.fn().mockResolvedValue(documentOutput),
    };
    const executionRecord: ReviewExecutionRecord = {
      id: "execution-document-1",
      createdAt: new Date("2026-05-25T10:00:00.000Z"),
      flowType: "document",
      status: "success",
      inputPayload: documentInput,
      outputPayload: documentOutput,
      durationMs: 12,
      requestHash: createPayloadHash(documentInput),
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    const findSuccessByHash = vi.fn().mockResolvedValue(executionRecord);
    const executionPersistence = {
      findSuccessByHash,
    } as unknown as DocumentExecutionPersistence;
    const service = new DefaultDocumentService({ documentEngine, executionPersistence });

    const output = await service.executeWithMetadata(documentInput);

    expect(output).toEqual({
      output: documentOutput,
      execution_id: "execution-document-1",
      cache_hit: false,
    });
    expect(documentEngine.execute).toHaveBeenCalledWith(documentInput);
    expect(findSuccessByHash).toHaveBeenCalledWith(createPayloadHash(documentInput));
  });
});
