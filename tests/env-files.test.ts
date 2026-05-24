import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { describe, expect, it } from "vitest";
import { Env } from "@shared";

describe(".env.example", () => {
  it("contem variaveis validas para iniciar a API em desenvolvimento", () => {
    const source = parse(readFileSync(".env.example"));
    const env = new Env(source).values;

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toContain("cpj_cobranca");
    expect(env.OPENROUTER_DEFAULT_MODEL).toBe("openai/gpt-4o-mini");
    expect(env.LANGSMITH_TRACING).toBe(false);
  });
});
