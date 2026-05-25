import type { DocumentRequest, DocumentResponse } from "@shared";

export interface DocumentService {
  execute(input: DocumentRequest): Promise<DocumentResponse>;
}

export class DefaultDocumentService implements DocumentService {
  async execute(input: DocumentRequest): Promise<DocumentResponse> {
    const title = input.title?.trim() || "Documentacao tecnica";
    const detailLevel = input.detail_level ?? "standard";

    return {
      title,
      summary: `Documentacao ${detailLevel} para codigo ${input.language}.`,
      documentation: `## ${title}\n\nEste documento descreve o comportamento observado no codigo informado.`,
      public_api: [],
      examples: [],
      gaps: ["Agente de documentacao real ainda nao conectado nesta etapa."],
    };
  }
}
