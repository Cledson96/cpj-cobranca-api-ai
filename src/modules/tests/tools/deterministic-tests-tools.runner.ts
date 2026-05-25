import type { TestsRequest } from "@shared";
import type {
  TestsBehaviorCandidate,
  TestsToolFinding,
  TestsToolResult,
} from "@/modules/tests/models";

const exportPatterns: Array<{ kind: string; pattern: RegExp }> = [
  { kind: "function", pattern: /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: "function", pattern: /^\s*export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: "class", pattern: /^\s*export\s+class\s+([A-Za-z_$][\w$]*)/ },
  { kind: "constant", pattern: /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/ },
];

const branchPattern = /\bif\s*\(([^)]+)\)/g;
const thrownErrorPattern = /throw\s+new\s+Error\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
const sideEffectPattern =
  /\b([A-Za-z_$][\w$]*\.(?:save|create|update|delete|insert|post|get|put|patch|request|send))\s*\(/g;

export class DeterministicTestsToolsRunner {
  run(input: TestsRequest): TestsToolResult {
    return {
      behaviorCandidates: this.extractBehaviorCandidates(input.code),
      findings: [
        ...this.findBranchConditions(input.code),
        ...this.findThrownErrors(input.code),
        ...this.findPossibleSideEffects(input.code),
      ],
    };
  }

  private extractBehaviorCandidates(code: string): TestsBehaviorCandidate[] {
    return code.split("\n").flatMap((line, index) => {
      for (const { kind, pattern } of exportPatterns) {
        const match = pattern.exec(line);
        if (match?.[1]) {
          return [{
            name: match[1],
            kind,
            line_hint: `linha ${index + 1}`,
            reason: "API publica exportada deve ter cobertura de comportamento.",
          }];
        }
      }

      return [];
    });
  }

  private findBranchConditions(code: string): TestsToolFinding[] {
    return this.collectMatches(code, branchPattern, (target) => ({
      kind: "branch_condition",
      target,
      confidence: "medium",
      description: "Condicao encontrada; gere testes para os caminhos verdadeiro e falso.",
    }));
  }

  private findThrownErrors(code: string): TestsToolFinding[] {
    return this.collectMatches(code, thrownErrorPattern, (target) => ({
      kind: "thrown_error",
      target,
      confidence: "medium",
      description: "Erro lancado explicitamente; gere teste de falha esperado.",
    }));
  }

  private findPossibleSideEffects(code: string): TestsToolFinding[] {
    return this.collectMatches(code, sideEffectPattern, (target) => ({
      kind: "possible_side_effect",
      target,
      confidence: "medium",
      description: "Codigo sugere persistencia ou chamada externa; avalie mock ou spy.",
    }));
  }

  private collectMatches(
    code: string,
    pattern: RegExp,
    createFinding: (target: string) => TestsToolFinding,
  ): TestsToolFinding[] {
    const findings = new Map<string, TestsToolFinding>();

    for (const match of code.matchAll(pattern)) {
      const target = match[1]?.trim();
      if (!target || findings.has(target)) {
        continue;
      }

      findings.set(target, createFinding(target));
    }

    return [...findings.values()];
  }
}
