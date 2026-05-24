import { describe, expect, it } from "vitest";
import { Env } from "@shared";
import { createTestEnvSource } from "./support/test-env";

describe("Env", () => {
  it("falha quando variaveis obrigatorias nao existem no ambiente", () => {
    expect(() => new Env({})).toThrow("Variaveis de ambiente invalidas");
  });

  it("carrega ambiente valido com defaults seguros", () => {
    const env = new Env(createTestEnvSource()).values;

    expect(env.PORT).toBe(3000);
    expect(env.HOST).toBe("0.0.0.0");
    expect(env.DATABASE_URL).toBe("postgresql://postgres:postgres@localhost:5432/cpj_test?schema=public");
    expect(env.OPENROUTER_DEFAULT_MODEL).toBe("openai/gpt-4o-mini");
    expect(env.LANGSMITH_TRACING).toBe(false);
  });

  it("converte variaveis numericas e booleanas", () => {
    const env = new Env({
      ...createTestEnvSource(),
      PORT: "3333",
      REQUEST_TIMEOUT_MS: "9000",
      LANGSMITH_TRACING: "true",
      OPENROUTER_FETCH_GENERATION_STATS: "false",
    }).values;

    expect(env.PORT).toBe(3333);
    expect(env.REQUEST_TIMEOUT_MS).toBe(9000);
    expect(env.LANGSMITH_TRACING).toBe(true);
    expect(env.OPENROUTER_FETCH_GENERATION_STATS).toBe(false);
  });
});
