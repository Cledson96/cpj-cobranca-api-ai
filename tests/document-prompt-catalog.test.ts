import { describe, expect, it } from "vitest";
import { DocumentPromptCatalog } from "@/modules/document/prompts";

describe("DocumentPromptCatalog", () => {
  it("carrega prompt de documentacao a partir de JSON", () => {
    const catalog = DocumentPromptCatalog.default();
    const prompt = catalog.getAgentSystemPrompt("Linguagem: TypeScript\nPublico: developer");

    expect(prompt).toContain("Linguagem: TypeScript");
    expect(prompt).toContain("Publico: developer");
    expect(prompt).toContain("documentacao tecnica");
    expect(prompt).toContain("Markdown");
    expect(prompt).toContain("Nao invente comportamento");
    expect(prompt).toContain("lacunas de inferencia");
  });
});
