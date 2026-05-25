import type { DocumentRequest, DocumentResponse } from "@shared";

export type DocumentPublicApiCandidate = {
  name: string;
  kind: string;
  line_hint: string | null;
};

export type DocumentToolFinding = {
  kind: "missing_public_api_comment" | "possible_side_effect";
  target: string;
  confidence: "low" | "medium";
  description: string;
};

export type DocumentToolResult = {
  publicApiCandidates: DocumentPublicApiCandidate[];
  findings: DocumentToolFinding[];
};

export type DocumentAnalysisContext = {
  input: DocumentRequest;
  toolResult: DocumentToolResult;
};

export interface DocumentAgentLike {
  generate(context: DocumentAnalysisContext): Promise<DocumentResponse>;
}
