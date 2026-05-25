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
});
