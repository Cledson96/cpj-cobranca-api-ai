import type { DocumentRequest } from "@shared";
import type {
  DocumentPublicApiCandidate,
  DocumentToolFinding,
  DocumentToolResult,
} from "@/modules/document/models";

const exportPatterns: Array<{ kind: string; pattern: RegExp }> = [
  { kind: "function", pattern: /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: "function", pattern: /^\s*export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: "class", pattern: /^\s*export\s+class\s+([A-Za-z_$][\w$]*)/ },
  { kind: "constant", pattern: /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/ },
  { kind: "interface", pattern: /^\s*export\s+interface\s+([A-Za-z_$][\w$]*)/ },
  { kind: "type", pattern: /^\s*export\s+type\s+([A-Za-z_$][\w$]*)/ },
];

const sideEffectPattern =
  /\b([A-Za-z_$][\w$]*\.(?:save|create|update|delete|insert|post|get|put|patch|request|send))\s*\(/g;

export class DeterministicDocumentToolsRunner {
  run(input: DocumentRequest): DocumentToolResult {
    const lines = input.code.split("\n");
    const publicApiCandidates = this.extractPublicApiCandidates(lines);

    return {
      publicApiCandidates,
      findings: [
        ...this.findMissingPublicApiComments(lines, publicApiCandidates),
        ...this.findPossibleSideEffects(input.code),
      ],
    };
  }

  private extractPublicApiCandidates(lines: string[]): DocumentPublicApiCandidate[] {
    return lines.flatMap((line, index) => {
      for (const { kind, pattern } of exportPatterns) {
        const match = pattern.exec(line);
        if (match?.[1]) {
          return [{
            name: match[1],
            kind,
            line_hint: `linha ${index + 1}`,
          }];
        }
      }

      return [];
    });
  }

  private findMissingPublicApiComments(
    lines: string[],
    publicApiCandidates: DocumentPublicApiCandidate[],
  ): DocumentToolFinding[] {
    return publicApiCandidates
      .filter((candidate) => !this.hasImmediateJsDoc(lines, candidate.line_hint))
      .map((candidate) => ({
        kind: "missing_public_api_comment",
        target: candidate.name,
        confidence: "low",
        description: "API publica exportada sem comentario JSDoc imediatamente anterior.",
      }));
  }

  private hasImmediateJsDoc(lines: string[], lineHint: string | null): boolean {
    if (!lineHint) {
      return false;
    }

    const lineNumber = Number(lineHint.replace("linha ", ""));
    const previousLine = lines[lineNumber - 2]?.trim();

    return Boolean(previousLine?.startsWith("/**") || previousLine?.endsWith("*/"));
  }

  private findPossibleSideEffects(code: string): DocumentToolFinding[] {
    const findings = new Map<string, DocumentToolFinding>();

    for (const match of code.matchAll(sideEffectPattern)) {
      const target = match[1];
      if (!target || findings.has(target)) {
        continue;
      }

      findings.set(target, {
        kind: "possible_side_effect",
        target,
        confidence: "medium",
        description: "Codigo sugere persistencia ou chamada externa que deve ser documentada.",
      });
    }

    return [...findings.values()];
  }
}
