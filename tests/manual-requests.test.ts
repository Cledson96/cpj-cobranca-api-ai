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

  it("usa os campos do contrato original do case para document e tests", () => {
    expect(requests).toContain('"doc_type"');
    expect(requests).not.toContain('"audience"');
    expect(requests).not.toContain('"detail_level"');

    expect(requests).toContain('"test_framework"');
    expect(requests).not.toContain('"include_mocks"');
  });
});
