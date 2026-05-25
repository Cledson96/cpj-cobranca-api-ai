import { describe, expect, it, vi } from "vitest";
import { DefaultDocumentService } from "@/modules/document/services";
import type { DocumentRequest, DocumentResponse } from "@shared";

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
});
