import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requests = readFileSync("requests/cpj-cobranca-api.http", "utf8");

describe("requests manuais", () => {
  it("inclui exemplos para todos os endpoints publicos principais", () => {
    expect(requests).toContain("/health");
    expect(requests).toContain("/api/v1/review");
    expect(requests).toContain("/api/v1/review/stream");
    expect(requests).toContain("/api/v1/compliance");
    expect(requests).toContain("/api/v1/document");
    expect(requests).toContain("/api/v1/tests");
    expect(requests).toContain("/api/v1/batch");
    expect(requests).toContain("/api/v1/history");
  });
});
