import type { DocumentRequest, DocumentResponse } from "@shared";
import { DocumentEngine, type DocumentExecutionPersistence } from "@/modules/document/engines";

export interface DocumentService {
  execute(input: DocumentRequest): Promise<DocumentResponse>;
}

export type DocumentEngineLike = {
  execute(input: DocumentRequest): Promise<DocumentResponse>;
};

export type DefaultDocumentServiceDependencies = {
  documentEngine?: DocumentEngineLike;
  executionPersistence?: DocumentExecutionPersistence;
};

export class DefaultDocumentService implements DocumentService {
  private readonly documentEngine?: DocumentEngineLike;
  private readonly executionPersistence?: DocumentExecutionPersistence;

  constructor(dependencies: DefaultDocumentServiceDependencies = {}) {
    this.documentEngine = dependencies.documentEngine;
    this.executionPersistence = dependencies.executionPersistence;
  }

  async execute(input: DocumentRequest): Promise<DocumentResponse> {
    const engine = this.documentEngine ?? DocumentEngine.createDefault({
      persistence: this.executionPersistence,
    });

    return engine.execute(input);
  }
}
