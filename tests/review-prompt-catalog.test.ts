import { describe, expect, it } from "vitest";
import { ReviewPromptCatalog } from "@/modules/review/prompts";

describe("ReviewPromptCatalog", () => {
  it("carrega prompts ricos de especialistas a partir de JSON", () => {
    const catalog = ReviewPromptCatalog.default();
    const prompt = catalog.getSpecialistSystemPrompt(
      "error_handling",
      "Linguagem: TypeScript",
    );

    expect(prompt).toContain("Linguagem: TypeScript");
    expect(prompt).toContain("Exemplo de falso positivo");
    expect(prompt).toContain("return db.query(sql)");
    expect(prompt).toContain("Nao diga que uma promise nao foi retornada quando houver return");
  });

  it("carrega prompt do agregador a partir de JSON", () => {
    const catalog = ReviewPromptCatalog.default();
    const prompt = catalog.getAggregatorSystemPrompt("Linguagem: TypeScript");

    expect(prompt).toContain("agregador final");
    expect(prompt).toContain("remova duplicidades");
    expect(prompt).toContain("Exemplo de consolidacao");
  });
});
