import { type AppEnv, Env } from "@shared";

export function createTestEnvSource(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/cpj_test?schema=public",
    OPENROUTER_DEFAULT_MODEL: "openai/gpt-4o-mini",
    OPENROUTER_SITE_URL: "http://localhost:3000",
    OPENROUTER_APP_TITLE: "CPJ Cobranca API AI",
    ...overrides,
  };
}

export function createTestEnv(overrides: NodeJS.ProcessEnv = {}): AppEnv {
  return new Env(createTestEnvSource(overrides)).values;
}
