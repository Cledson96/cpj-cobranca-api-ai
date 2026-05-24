import type { SupportedLanguage } from "@shared";

export type ReviewGraphNode =
  | "review_typescript"
  | "review_javascript"
  | "review_python"
  | "review_php";

export type LanguageProfileConfig = {
  language: SupportedLanguage;
  displayName: string;
  extensions: string[];
  namingGuidelines: string[];
  errorHandlingGuidelines: string[];
  resourceLeakGuidelines: string[];
  securityGuidelines: string[];
};

export interface LanguageProfile extends LanguageProfileConfig {
  toPromptContext(): string;
}

export abstract class BaseLanguageProfile implements LanguageProfile {
  readonly language: SupportedLanguage;
  readonly displayName: string;
  readonly extensions: string[];
  readonly namingGuidelines: string[];
  readonly errorHandlingGuidelines: string[];
  readonly resourceLeakGuidelines: string[];
  readonly securityGuidelines: string[];

  protected constructor(config: LanguageProfileConfig) {
    this.language = config.language;
    this.displayName = config.displayName;
    this.extensions = config.extensions;
    this.namingGuidelines = config.namingGuidelines;
    this.errorHandlingGuidelines = config.errorHandlingGuidelines;
    this.resourceLeakGuidelines = config.resourceLeakGuidelines;
    this.securityGuidelines = config.securityGuidelines;
  }

  toPromptContext(): string {
    return [
      `Linguagem: ${this.displayName}`,
      `Extensoes comuns: ${this.extensions.join(", ")}`,
      `Nomenclatura: ${this.namingGuidelines.join("; ")}`,
      `Erros: ${this.errorHandlingGuidelines.join("; ")}`,
      `Recursos: ${this.resourceLeakGuidelines.join("; ")}`,
      `Seguranca: ${this.securityGuidelines.join("; ")}`,
    ].join("\n");
  }
}
