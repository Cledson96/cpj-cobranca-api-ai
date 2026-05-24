import { BadRequestError } from "@/infrastructure/errors";
import { supportedLanguageSchema } from "@shared";
import type { ReviewRequest, SupportedLanguage } from "@shared";
import { JavaScriptLanguageProfile } from "./javascript.profile";
import type { LanguageProfile, ReviewGraphNode } from "./language-profile";
import { PhpLanguageProfile } from "./php.profile";
import { PythonLanguageProfile } from "./python.profile";
import { TypeScriptLanguageProfile } from "./typescript.profile";

export type LanguageRouterInput = {
  code: string;
  language: string;
  context?: string;
};

export type ReviewLanguageRoute = {
  language: SupportedLanguage;
  graphNode: ReviewGraphNode;
  profile: LanguageProfile;
};

export class LanguageRouter {
  route(input: LanguageRouterInput | ReviewRequest): ReviewLanguageRoute {
    const parsed = supportedLanguageSchema.safeParse(input.language);

    if (!parsed.success) {
      throw new BadRequestError(`Linguagem nao suportada para review: ${input.language}.`);
    }

    return this.createRoute(parsed.data);
  }

  private createRoute(language: SupportedLanguage): ReviewLanguageRoute {
    if (language === "typescript") {
      return {
        language,
        graphNode: "review_typescript",
        profile: new TypeScriptLanguageProfile(),
      };
    }

    if (language === "javascript") {
      return {
        language,
        graphNode: "review_javascript",
        profile: new JavaScriptLanguageProfile(),
      };
    }

    if (language === "python") {
      return {
        language,
        graphNode: "review_python",
        profile: new PythonLanguageProfile(),
      };
    }

    return {
      language,
      graphNode: "review_php",
      profile: new PhpLanguageProfile(),
    };
  }
}
