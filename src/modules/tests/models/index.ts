import type { TestsRequest, TestsResponse } from "@shared";

export type TestsBehaviorCandidate = {
  name: string;
  kind: string;
  line_hint: string | null;
  reason: string;
};

export type TestsToolFinding = {
  kind: "branch_condition" | "possible_side_effect" | "thrown_error";
  target: string;
  confidence: "low" | "medium";
  description: string;
};

export type TestsToolResult = {
  behaviorCandidates: TestsBehaviorCandidate[];
  findings: TestsToolFinding[];
};

export type TestsAnalysisContext = {
  input: TestsRequest;
  toolResult: TestsToolResult;
};

export interface TestsAgentLike {
  generate(context: TestsAnalysisContext): Promise<TestsResponse>;
}
