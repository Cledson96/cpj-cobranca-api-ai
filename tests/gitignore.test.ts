import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe(".gitignore", () => {
  it("mantem planos internos fora do GitHub", () => {
    const gitignore = readFileSync(".gitignore", "utf8");

    expect(gitignore).toContain("PLANO.md");
    expect(gitignore).toContain("docs/PLANO_INCREMENTAL.md");
  });
});
