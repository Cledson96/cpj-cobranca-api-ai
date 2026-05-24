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
    expect(prompt).toContain("Sem tratamento local nao e issue quando a promise foi retornada");
  });

  it("carrega prompt do agregador a partir de JSON", () => {
    const catalog = ReviewPromptCatalog.default();
    const prompt = catalog.getAggregatorSystemPrompt("Linguagem: TypeScript");

    expect(prompt).toContain("agregador final");
    expect(prompt).toContain("remova duplicidades");
    expect(prompt).toContain("Exemplo de consolidacao");
    expect(prompt).toContain("Nao transforme return db.query(sql) em issue de tratamento de erro");
    expect(prompt).toContain("Nao chame de pura uma funcao que faz log, banco, rede, filesystem ou outro efeito colateral");
    expect(prompt).toContain("Se sugerir prepared statement e o contrato atual nao aceitar parametros");
    expect(prompt).toContain("Nao rebaixe codigo por usar nome em portugues");
  });
});
