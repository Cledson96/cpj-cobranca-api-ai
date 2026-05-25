import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync("README.md", "utf8");

describe("README final", () => {
  it("documenta batch como fluxo entregue", () => {
    expect(readme).toContain("`review`, `compliance`, `document`, `tests` e `batch`");
    expect(readme).toContain("POST   | `/api/v1/batch`");
    expect(readme).toContain("### POST /api/v1/batch");
    expect(readme).not.toContain("O fluxo `batch` ainda esta fora do escopo");
  });

  it("referencia exemplos manuais completos", () => {
    expect(readme).toContain("requests/cpj-cobranca-api.http");
  });

  it("explica decisoes tecnicas, custo OpenRouter e proximos passos", () => {
    expect(readme).toContain("## Decisoes tecnicas");
    expect(readme).toContain("## Custo estimado");
    expect(readme).toContain("## O que eu faria com mais tempo");
    expect(readme).toContain("OpenRouter");
  });

  it("documenta exemplos no contrato do case para document e tests", () => {
    expect(readme).toContain('"doc_type": "technical"');
    expect(readme).toContain('"inputs"');
    expect(readme).toContain('"outputs"');
    expect(readme).toContain('"usage_example"');

    expect(readme).toContain('"test_framework": "vitest"');
    expect(readme).toContain('"test_file"');
    expect(readme).toContain('"coverage_hints"');
    expect(readme).not.toContain('"audience": "developer"');
    expect(readme).not.toContain('"detail_level": "standard"');
  });
});
