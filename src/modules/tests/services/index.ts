import type { TestsRequest, TestsResponse } from "@shared";
import { TestsEngine, type TestsExecutionPersistence } from "@/modules/tests/engines";

export interface TestsService {
  execute(input: TestsRequest): Promise<TestsResponse>;
}

export type TestsEngineLike = {
  execute(input: TestsRequest): Promise<TestsResponse>;
};

export type DefaultTestsServiceDependencies = {
  testsEngine?: TestsEngineLike;
  executionPersistence?: TestsExecutionPersistence;
};

export class DefaultTestsService implements TestsService {
  private readonly testsEngine?: TestsEngineLike;
  private readonly executionPersistence?: TestsExecutionPersistence;

  constructor(dependencies: DefaultTestsServiceDependencies = {}) {
    this.testsEngine = dependencies.testsEngine;
    this.executionPersistence = dependencies.executionPersistence;
  }

  async execute(input: TestsRequest): Promise<TestsResponse> {
    const engine = this.testsEngine ?? TestsEngine.createDefault({
      persistence: this.executionPersistence,
    });

    return engine.execute(input);
  }
}
