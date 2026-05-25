import { createPayloadHash, type TestsRequest, type TestsResponse } from "@shared";
import { TestsEngine, type TestsExecutionPersistence } from "@/modules/tests/engines";
import type { FlowExecutionMetadata, ReviewExecutionRecord } from "@/modules/executions";
import type { PromptRuntimeResolver } from "@/modules/prompts";

export interface TestsService {
  execute(input: TestsRequest): Promise<TestsResponse>;
  executeWithMetadata?(input: TestsRequest): Promise<FlowExecutionMetadata<TestsResponse>>;
}

export type TestsEngineLike = {
  execute(input: TestsRequest): Promise<TestsResponse>;
};

export type DefaultTestsServiceDependencies = {
  testsEngine?: TestsEngineLike;
  executionPersistence?: TestsExecutionPersistence;
  promptResolver?: PromptRuntimeResolver;
};

export class DefaultTestsService implements TestsService {
  private readonly testsEngine?: TestsEngineLike;
  private readonly executionPersistence?: TestsExecutionPersistence;
  private readonly promptResolver?: PromptRuntimeResolver;

  constructor(dependencies: DefaultTestsServiceDependencies = {}) {
    this.testsEngine = dependencies.testsEngine;
    this.executionPersistence = dependencies.executionPersistence;
    this.promptResolver = dependencies.promptResolver;
  }

  async execute(input: TestsRequest): Promise<TestsResponse> {
    const engine = this.testsEngine ?? TestsEngine.createDefault({
      persistence: this.executionPersistence,
      promptResolver: this.promptResolver,
    });

    return engine.execute(input);
  }

  async executeWithMetadata(input: TestsRequest): Promise<FlowExecutionMetadata<TestsResponse>> {
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
