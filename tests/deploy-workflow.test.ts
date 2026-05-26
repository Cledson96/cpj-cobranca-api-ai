import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe(".github/workflows/deploy.yml", () => {
  it("executa deploy automatico em push para main", () => {
    const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");

    expect(workflow).toContain("push:");
    expect(workflow).toContain("branches:");
    expect(workflow).toContain("- main");
  });

  it("gera .env de producao com configuracao de retry", () => {
    const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");

    expect(workflow).toContain(
      "EXTERNAL_RETRY_ATTEMPTS=${{ secrets.EXTERNAL_RETRY_ATTEMPTS || '2' }}",
    );
    expect(workflow).toContain(
      "EXTERNAL_RETRY_BASE_DELAY_MS=${{ secrets.EXTERNAL_RETRY_BASE_DELAY_MS || '250' }}",
    );
  });
});
