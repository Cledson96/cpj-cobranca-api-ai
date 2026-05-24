import { describe, expect, it } from "vitest";
import { BadRequestError } from "@/infrastructure/errors";
import {
  JavaScriptLanguageProfile,
  LanguageRouter,
  PhpLanguageProfile,
  PythonLanguageProfile,
  TypeScriptLanguageProfile,
} from "@/modules/review/language";
import { supportedLanguageSchema } from "@shared";

describe("LanguageRouter do review", () => {
  it("mantem php como linguagem suportada no contrato publico", () => {
    expect(supportedLanguageSchema.parse("php")).toBe("php");
  });

  it("roteia typescript para o grafo e profile de TypeScript", () => {
    const router = new LanguageRouter();

    const route = router.route({
      code: "export const total: number = 1;",
      language: "typescript",
    });

    expect(route.graphNode).toBe("review_typescript");
    expect(route.profile).toBeInstanceOf(TypeScriptLanguageProfile);
    expect(route.profile.language).toBe("typescript");
  });

  it("roteia javascript, python e php para seus fluxos dedicados", () => {
    const router = new LanguageRouter();

    const javascriptRoute = router.route({
      code: "const total = 1;",
      language: "javascript",
    });
    const pythonRoute = router.route({
      code: "total = 1",
      language: "python",
    });
    const phpRoute = router.route({
      code: "<?php $total = 1;",
      language: "php",
    });

    expect(javascriptRoute.graphNode).toBe("review_javascript");
    expect(javascriptRoute.profile).toBeInstanceOf(JavaScriptLanguageProfile);
    expect(pythonRoute.graphNode).toBe("review_python");
    expect(pythonRoute.profile).toBeInstanceOf(PythonLanguageProfile);
    expect(phpRoute.graphNode).toBe("review_php");
    expect(phpRoute.profile).toBeInstanceOf(PhpLanguageProfile);
  });

  it("falha com erro de dominio quando a linguagem nao e suportada", () => {
    const router = new LanguageRouter();

    expect(() =>
      router.route({
        code: "public class Demo {}",
        language: "java",
      }),
    ).toThrow(BadRequestError);
  });
});
