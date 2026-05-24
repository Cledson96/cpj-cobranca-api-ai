import type { ReviewRequest } from "@shared";
import type { ReviewFinding } from "../models";

export class DeterministicReviewToolsRunner {
  run(input: ReviewRequest): ReviewFinding[] {
    return [
      ...this.findSensitiveLogs(input.code),
      ...this.findObviousSqlInterpolation(input.code),
    ];
  }

  private findSensitiveLogs(code: string): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      const hasLog = lowerLine.includes("console.log") || lowerLine.includes("print_r") || lowerLine.includes("error_log");
      const hasSensitiveData =
        lowerLine.includes("cpf") ||
        lowerLine.includes("senha") ||
        lowerLine.includes("password") ||
        lowerLine.includes("token") ||
        lowerLine.includes("secret");

      if (hasLog && hasSensitiveData) {
        findings.push({
          severity: "high",
          line_hint: `linha ${index + 1}`,
          description: "Possivel dado sensivel sendo registrado em log.",
          suggestion: "Remova dados sensiveis do log ou aplique mascaramento antes de registrar.",
        });
      }
    });

    return findings;
  }

  private findObviousSqlInterpolation(code: string): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      const hasSqlKeyword =
        lowerLine.includes("select ") ||
        lowerLine.includes("insert ") ||
        lowerLine.includes("update ") ||
        lowerLine.includes("delete ");
      const hasInterpolation =
        line.includes("${") ||
        line.includes("$_GET") ||
        line.includes("$_POST") ||
        lowerLine.includes("format(");

      if (hasSqlKeyword && hasInterpolation) {
        findings.push({
          severity: "high",
          line_hint: `linha ${index + 1}`,
          description: "Possivel SQL injection por query montada com interpolacao ou entrada externa.",
          suggestion: "Use parametros preparados e valide entradas antes de montar consultas.",
        });
      }
    });

    return findings;
  }
}
