import type { ComplianceRequest, ComplianceResponse } from "@shared";

export interface ComplianceService {
  execute(input: ComplianceRequest): Promise<ComplianceResponse>;
}

export class DefaultComplianceService implements ComplianceService {
  async execute(input: ComplianceRequest): Promise<ComplianceResponse> {
    void input;

    return {
      compliant: false,
      compliance_score: 0,
      covered_requirements: [],
      missing_requirements: ["Fluxo compliance ainda nao conectado ao agente real."],
      partial_requirements: [],
      verdict: "A rota de compliance esta disponivel com service mockado nesta etapa.",
    };
  }
}
