import type { DocumentRequest, DocumentResponse } from "@shared";
import type { DocumentPromptCatalog } from "@/modules/document/prompts";

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
  promptCatalog?: DocumentPromptCatalog;
};

export interface DocumentAgentLike {
  generate(context: DocumentAnalysisContext): Promise<DocumentResponse>;
}
