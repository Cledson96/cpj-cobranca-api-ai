import { describe, expect, it } from "vitest";
import { TestsPromptCatalog } from "@/modules/tests/prompts";

describe("TestsPromptCatalog", () => {
  it("carrega prompt de geracao de testes a partir de JSON", () => {
    const catalog = TestsPromptCatalog.default();
    const prompt = catalog.getAgentSystemPrompt("Linguagem: TypeScript\nFramework: vitest");

    expect(prompt).toContain("Linguagem: TypeScript");
    expect(prompt).toContain("Framework: vitest");
    expect(prompt).toContain("agente senior de testes");
    expect(prompt).toContain("testes de comportamento");
    expect(prompt).toContain("Nao afirme que executou testes");
    expect(prompt).toContain("lacunas e premissas");
  });
});
