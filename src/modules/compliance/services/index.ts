import type { ComplianceRequest, ComplianceResponse } from "@shared";
import { ComplianceEngine, type ComplianceExecutionPersistence } from "@/modules/compliance/engines";

export interface ComplianceService {
  execute(input: ComplianceRequest): Promise<ComplianceResponse>;
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
}
