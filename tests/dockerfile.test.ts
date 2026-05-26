import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dockerfile", () => {
  it("copia apenas arquivos que existem no contexto do build", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const copySources = dockerfile
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith("COPY "))
      .filter((line) => !line.includes("--from="))
      .flatMap((line) => line.trim().split(/\s+/).slice(1, -1))
      .filter((source) => !source.startsWith("--"));

    for (const source of copySources) {
      const normalizedSource = source.replace(/\/$/, "");
      expect(existsSync(normalizedSource), `${source} should exist`).toBe(true);
    }
  });

  it("aplica migrations antes de iniciar a API no container", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).toContain("prisma migrate deploy");
    expect(dockerfile).toContain("node dist/server.js");
  });

  it("executa seed inicial antes de iniciar a API no container", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).toContain("prisma db seed");
    expect(dockerfile).toContain("COPY --from=builder /app/src ./src");
    expect(dockerfile).toContain("COPY --from=builder /app/tsconfig.json ./tsconfig.json");
    expect(dockerfile.indexOf("prisma migrate deploy")).toBeLessThan(
      dockerfile.indexOf("prisma db seed"),
    );
    expect(dockerfile.indexOf("prisma db seed")).toBeLessThan(
      dockerfile.indexOf("node dist/server.js"),
    );
  });

  it("disponibiliza schema Prisma antes do npm ci executar o postinstall", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile.indexOf("COPY prisma/ ./prisma/")).toBeLessThan(
      dockerfile.indexOf("RUN npm ci"),
    );
  });
});
