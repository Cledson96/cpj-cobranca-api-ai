import { z } from "zod";
import type { ReviewRequest } from "@shared";
import type { LanguageProfile } from "../language";

const nonEmptyString = () => z.string().trim().min(1);

export const reviewFindingSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  line_hint: z.string().nullable(),
  description: nonEmptyString(),
  suggestion: nonEmptyString(),
});
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;

export const specialistAgentOutputSchema = z.object({
  agent_name: nonEmptyString(),
  findings: z.array(reviewFindingSchema),
  positives: z.array(nonEmptyString()),
  summary: nonEmptyString(),
});
export type SpecialistAgentOutput = z.infer<typeof specialistAgentOutputSchema>;

export type ReviewAnalysisContext = {
  input: ReviewRequest;
  languageProfile: LanguageProfile;
  deterministicFindings: ReviewFinding[];
  agentOutputs: SpecialistAgentOutput[];
};
