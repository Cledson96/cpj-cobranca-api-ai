import type { DocumentRequest, DocumentResponse } from "@shared";

export interface DocumentService {
  execute(input: DocumentRequest): Promise<DocumentResponse>;
}

export class DefaultDocumentService implements DocumentService {
  async execute(input: DocumentRequest): Promise<DocumentResponse> {
    const title = input.title?.trim() || "Documentacao tecnica";

    return {
      title,
      summary: `Documentacao ${input.detail_level} para codigo ${input.language}.`,
      documentation: `## ${title}\n\nEste documento descreve o comportamento observado no codigo informado.`,
      public_api: [],
      examples: [],
      gaps: ["Agente de documentacao real ainda nao conectado nesta etapa."],
    };
  }
}
