import type { ComplianceRequest } from "@shared";
import type {
  ComplianceRequirementCandidate,
  ComplianceToolFinding,
  ComplianceToolResult,
} from "@/modules/compliance/models";

const stopWords = new Set([
  "apenas",
  "cada",
  "com",
  "como",
  "deve",
  "para",
  "pela",
  "pelo",
  "por",
  "quando",
  "que",
  "sem",
  "todos",
  "toda",
  "todo",
]);

export class DeterministicComplianceToolsRunner {
  run(input: ComplianceRequest): ComplianceToolResult {
    const requirements = this.extractRequirements(input.task_description);

    return {
      requirements,
      findings: this.findPossibleMissingRequirements(requirements, input.code),
    };
  }

  private extractRequirements(taskDescription: string): ComplianceRequirementCandidate[] {
    const lineRequirements = taskDescription
      .split("\n")
      .map((line, index) => ({
        text: this.cleanRequirementText(line),
        line_hint: `linha ${index + 1}`,
      }))
      .filter((requirement) => requirement.text.length > 0);

    if (lineRequirements.length > 1) {
      return lineRequirements;
    }

    return taskDescription
      .split(/[.;]/)
      .map((text) => ({
        text: this.cleanRequirementText(text),
        line_hint: null,
      }))
      .filter((requirement) => requirement.text.length > 0);
  }

  private cleanRequirementText(text: string): string {
    return text
      .trim()
      .replace(/^[-*]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();
  }

  private findPossibleMissingRequirements(
    requirements: ComplianceRequirementCandidate[],
    code: string,
  ): ComplianceToolFinding[] {
    const normalizedCode = normalize(code);

    return requirements
      .filter((requirement) => !this.hasTextualEvidence(requirement.text, normalizedCode))
      .map((requirement) => ({
        kind: "possible_missing_requirement",
        requirement: requirement.text,
        confidence: "low",
        description: "Nao encontrei evidencia textual simples deste requisito no codigo.",
      }));
  }

  private hasTextualEvidence(requirement: string, normalizedCode: string): boolean {
    const tokens = normalize(requirement)
      .split(/\W+/)
      .filter((token) => token.length >= 4 && !stopWords.has(token));

    if (tokens.length === 0) {
      return false;
    }

    return tokens.some((token) => normalizedCode.includes(token));
  }
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
