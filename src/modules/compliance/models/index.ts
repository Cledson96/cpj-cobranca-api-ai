import type { ComplianceRequest, ComplianceResponse } from "@shared";

export type ComplianceRequirementCandidate = {
  text: string;
  line_hint: string | null;
};

export type ComplianceToolFinding = {
  kind: "possible_missing_requirement";
  requirement: string;
  confidence: "low" | "medium";
  description: string;
};

export type ComplianceToolResult = {
  requirements: ComplianceRequirementCandidate[];
  findings: ComplianceToolFinding[];
};

export type ComplianceAnalysisContext = {
  input: ComplianceRequest;
  toolResult: ComplianceToolResult;
};

export interface ComplianceAgentLike {
  analyze(context: ComplianceAnalysisContext): Promise<ComplianceResponse>;
}
