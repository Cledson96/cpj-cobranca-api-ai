import { createPayloadHash, type DocumentRequest, type DocumentResponse } from "@shared";
import { DocumentEngine, type DocumentExecutionPersistence } from "@/modules/document/engines";
import type { FlowExecutionMetadata, ReviewExecutionRecord } from "@/modules/executions";
import type { PromptRuntimeResolver } from "@/modules/prompts";

export interface DocumentService {
  execute(input: DocumentRequest): Promise<DocumentResponse>;
  executeWithMetadata?(input: DocumentRequest): Promise<FlowExecutionMetadata<DocumentResponse>>;
}

export type DocumentEngineLike = {
  execute(input: DocumentRequest): Promise<DocumentResponse>;
};

export type DefaultDocumentServiceDependencies = {
  documentEngine?: DocumentEngineLike;
  executionPersistence?: DocumentExecutionPersistence;
  promptResolver?: PromptRuntimeResolver;
};

export class DefaultDocumentService implements DocumentService {
  private readonly documentEngine?: DocumentEngineLike;
  private readonly executionPersistence?: DocumentExecutionPersistence;
  private readonly promptResolver?: PromptRuntimeResolver;

  constructor(dependencies: DefaultDocumentServiceDependencies = {}) {
    this.documentEngine = dependencies.documentEngine;
    this.executionPersistence = dependencies.executionPersistence;
    this.promptResolver = dependencies.promptResolver;
  }

  async execute(input: DocumentRequest): Promise<DocumentResponse> {
    const engine = this.documentEngine ?? DocumentEngine.createDefault({
      persistence: this.executionPersistence,
      promptResolver: this.promptResolver,
    });

    return engine.execute(input);
  }

  async executeWithMetadata(input: DocumentRequest): Promise<FlowExecutionMetadata<DocumentResponse>> {
    const output = await this.execute(input);
    let execution: ReviewExecutionRecord | null = null;

    if (this.executionPersistence) {
      try {
        execution = await this.executionPersistence.findSuccessByHash(createPayloadHash(input));
      } catch {
        // Falhas na consulta de metadados nao devem transformar sucesso em erro.
      }
    }

    return {
      output,
      execution_id: execution?.id ?? null,
      cache_hit: execution?.cacheHit ?? null,
    };
  }
}
