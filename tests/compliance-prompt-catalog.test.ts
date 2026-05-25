import { describe, expect, it } from "vitest";
import { CompliancePromptCatalog } from "@/modules/compliance/prompts";

describe("CompliancePromptCatalog", () => {
  it("carrega prompt de compliance a partir de JSON", () => {
    const catalog = CompliancePromptCatalog.default();
    const prompt = catalog.getAgentSystemPrompt("Linguagem: TypeScript");

    expect(prompt).toContain("Linguagem: TypeScript");
    expect(prompt).toContain("cruzar cada requisito");
    expect(prompt).toContain("Nao invente requisito");
    expect(prompt).toContain("auditoria obrigatoria");
    expect(prompt).toContain("lacunas, excessos e conformidades");
  });
});
