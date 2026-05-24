import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("docker-compose.yml", () => {
  it("define postgres local compativel com DATABASE_URL padrao", () => {
    const compose = readFileSync("docker-compose.yml", "utf8");

    expect(compose).toContain("postgres:");
    expect(compose).toContain("POSTGRES_DB: cpj_cobranca");
    expect(compose).toContain("POSTGRES_USER: postgres");
    expect(compose).toContain("POSTGRES_PASSWORD: postgres");
    expect(compose).toContain('"5432:5432"');
    expect(compose).toContain("pg_isready -U postgres -d cpj_cobranca");
  });
});
