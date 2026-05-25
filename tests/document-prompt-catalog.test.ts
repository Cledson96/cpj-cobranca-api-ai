import { describe, expect, it } from "vitest";
import { DocumentPromptCatalog } from "@/modules/document/prompts";

describe("DocumentPromptCatalog", () => {
  it("carrega prompt de documentacao a partir de JSON", () => {
    const catalog = DocumentPromptCatalog.default();
    const prompt = catalog.getAgentSystemPrompt("Linguagem: TypeScript\nTipo de documentacao: technical");

    expect(prompt).toContain("Linguagem: TypeScript");
    expect(prompt).toContain("Tipo de documentacao: technical");
    expect(prompt).toContain("documentacao tecnica");
    expect(prompt).toContain("Nao invente comportamento");
    expect(prompt).toContain("doc_type");
    expect(prompt).toContain("usage_example");
    expect(prompt).not.toContain("public_api");
  });
});
