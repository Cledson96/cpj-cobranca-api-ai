import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  CORS_ORIGIN: z.string().trim().min(1).default("*"),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(2_097_152),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().trim().min(1).default("1 minute"),
  DATABASE_URL: z.string().trim().min(1),
  OPENROUTER_API_KEY: z.string().trim().default(""),
  OPENROUTER_DEFAULT_MODEL: z.string().trim().min(1),
  OPENROUTER_SITE_URL: z.string().trim().min(1),
  OPENROUTER_APP_TITLE: z.string().trim().min(1),
  OPENROUTER_FETCH_GENERATION_STATS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  LANGSMITH_TRACING: booleanString,
  LANGSMITH_API_KEY: z.string().trim().default(""),
  LANGSMITH_PROJECT: z.string().trim().min(1).default("cpj-cobranca-api-ai"),
  WEBHOOK_CALLBACK_URL: z.string().trim().url().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export class Env {
  readonly values: AppEnv;

  constructor(source: NodeJS.ProcessEnv = process.env) {
    const result = envSchema.safeParse(source);
    if (!result.success) {
      const details = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
      throw new Error(`Variaveis de ambiente invalidas: ${details}`);
    }

    this.values = result.data;
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return new Env(source).values;
}

export function loadLocalEnvFiles(): void {
  const candidates = [resolve(process.cwd(), ".env")];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false });
    }
  }
}
