import { describe, expect, it } from "vitest";
import { DeterministicDocumentToolsRunner } from "@/modules/document/tools";

describe("DeterministicDocumentToolsRunner", () => {
  it("extrai candidatos de API publica exportados do codigo", () => {
    const runner = new DeterministicDocumentToolsRunner();

    const result = runner.run({
      code: [
        "export async function chargeCustomer(customerId: string, amount: number) {",
        "  await repository.save({ customerId, amount });",
        "  return { approved: amount > 0 };",
        "}",
        "export class BillingPolicy {}",
      ].join("\n"),
      language: "typescript",
      doc_type: "technical",
    });

    expect(result.publicApiCandidates).toEqual([
      {
        name: "chargeCustomer",
        kind: "function",
        line_hint: "linha 1",
      },
      {
        name: "BillingPolicy",
        kind: "class",
        line_hint: "linha 5",
      },
    ]);
  });

  it("sinaliza efeitos colaterais e exports sem comentario explicativo", () => {
    const runner = new DeterministicDocumentToolsRunner();

    const result = runner.run({
      code: [
        "export async function chargeCustomer(customerId: string, amount: number) {",
        "  await repository.save({ customerId, amount });",
        "  return { approved: amount > 0 };",
        "}",
      ].join("\n"),
      language: "typescript",
      doc_type: "technical",
    });

    expect(result.findings).toContainEqual({
      kind: "possible_side_effect",
      target: "repository.save",
      confidence: "medium",
      description: "Codigo sugere persistencia ou chamada externa que deve ser documentada.",
    });
    expect(result.findings).toContainEqual({
      kind: "missing_public_api_comment",
      target: "chargeCustomer",
      confidence: "low",
      description: "API publica exportada sem comentario JSDoc imediatamente anterior.",
    });
  });
});
