import { describe, expect, it } from "vitest";
import { FileSystemCodeStandardsLoader } from "@/modules/review/pull-request";

describe("FileSystemCodeStandardsLoader", () => {
  it("carrega padroes relevantes para arquivos TypeScript, PHP e Python", async () => {
    const loader = new FileSystemCodeStandardsLoader("code-standards");

    const standards = await loader.loadForFiles([
      "src/modules/billing/service.ts",
      "src/Controller/UserController.php",
      "app/api/routes.py",
    ]);

    expect(standards.map((item) => item.technology)).toEqual([
      "node-typescript",
      "php",
      "python",
    ]);
    expect(standards[0].content).toContain("Node.js com TypeScript");
    expect(standards[1].content).toContain("PHP");
    expect(standards[2].content).toContain("Python");
  });
});
