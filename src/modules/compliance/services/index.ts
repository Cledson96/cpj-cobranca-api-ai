import { createPayloadHash, type ComplianceRequest, type ComplianceResponse } from "@shared";
import { ComplianceEngine, type ComplianceExecutionPersistence } from "@/modules/compliance/engines";
import type { FlowExecutionMetadata, ReviewExecutionRecord } from "@/modules/executions";

export interface ComplianceService {
  execute(input: ComplianceRequest): Promise<ComplianceResponse>;
  executeWithMetadata?(input: ComplianceRequest): Promise<FlowExecutionMetadata<ComplianceResponse>>;
}

export type DefaultComplianceServiceDependencies = {
  complianceEngine?: ComplianceEngine;
  executionPersistence?: ComplianceExecutionPersistence;
};

export class DefaultComplianceService implements ComplianceService {
  private readonly complianceEngine?: ComplianceEngine;
  private readonly executionPersistence?: ComplianceExecutionPersistence;

  constructor(dependencies: DefaultComplianceServiceDependencies = {}) {
    this.complianceEngine = dependencies.complianceEngine;
    this.executionPersistence = dependencies.executionPersistence;
  }

  async execute(input: ComplianceRequest): Promise<ComplianceResponse> {
    const engine = this.complianceEngine ?? ComplianceEngine.createDefault({
      persistence: this.executionPersistence,
    });

    return engine.execute(input);
  }

  async executeWithMetadata(input: ComplianceRequest): Promise<FlowExecutionMetadata<ComplianceResponse>> {
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
