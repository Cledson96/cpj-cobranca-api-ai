import { describe, expect, it, vi } from "vitest";
import { DefaultDocumentService } from "@/modules/document/services";
import type { DocumentRequest, DocumentResponse } from "@shared";

const documentInput: DocumentRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
};

const documentOutput: DocumentResponse = {
  title: "Cobranca",
  summary: "Documenta cobranca.",
  documentation: "## Cobranca",
  public_api: [],
  examples: [],
  gaps: [],
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
