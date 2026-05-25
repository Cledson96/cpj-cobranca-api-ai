import { describe, expect, it } from "vitest";
import { DeterministicTestsToolsRunner } from "@/modules/tests/tools";

describe("DeterministicTestsToolsRunner", () => {
  it("extrai candidatos de comportamento testavel a partir de exports", () => {
    const runner = new DeterministicTestsToolsRunner();

    const result = runner.run({
      code: [
        "export async function chargeCustomer(customerId: string, amount: number) {",
        "  if (amount <= 0) throw new Error('invalid amount');",
        "  await repository.save({ customerId, amount });",
        "  return { approved: true };",
        "}",
      ].join("\n"),
      language: "typescript",
      test_framework: "vitest",
    });

    expect(result.behaviorCandidates).toEqual([
      {
        name: "chargeCustomer",
        kind: "function",
        line_hint: "linha 1",
        reason: "API publica exportada deve ter cobertura de comportamento.",
      },
    ]);
  });

  it("sinaliza branches, erros lancados e efeitos colaterais para cobrir", () => {
    const runner = new DeterministicTestsToolsRunner();

    const result = runner.run({
      code: [
        "export async function chargeCustomer(customerId: string, amount: number) {",
        "  if (amount <= 0) throw new Error('invalid amount');",
        "  await repository.save({ customerId, amount });",
        "  return { approved: true };",
        "}",
      ].join("\n"),
      language: "typescript",
      test_framework: "vitest",
    });

    expect(result.findings).toContainEqual({
      kind: "branch_condition",
      target: "amount <= 0",
      confidence: "medium",
      description: "Condicao encontrada; gere testes para os caminhos verdadeiro e falso.",
    });
    expect(result.findings).toContainEqual({
      kind: "thrown_error",
      target: "invalid amount",
      confidence: "medium",
      description: "Erro lancado explicitamente; gere teste de falha esperado.",
    });
    expect(result.findings).toContainEqual({
      kind: "possible_side_effect",
      target: "repository.save",
      confidence: "medium",
      description: "Codigo sugere persistencia ou chamada externa; avalie mock ou spy.",
    });
  });
});
