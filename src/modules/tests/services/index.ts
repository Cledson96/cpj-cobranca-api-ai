import type { TestsRequest, TestsResponse } from "@shared";

export interface TestsService {
  execute(input: TestsRequest): Promise<TestsResponse>;
}

export class DefaultTestsService implements TestsService {
  async execute(input: TestsRequest): Promise<TestsResponse> {
    const framework = input.framework ?? "auto";

    return {
      framework,
      strategy_summary: `Geracao inicial de testes para codigo ${input.language}.`,
      test_cases: [],
      test_code: "// Agente de testes real ainda nao conectado nesta etapa.",
      gaps: ["Agente de testes real ainda nao conectado nesta etapa."],
    };
  }
}
