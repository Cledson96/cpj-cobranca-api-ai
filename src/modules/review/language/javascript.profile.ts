import { BaseLanguageProfile } from "./language-profile";

export class JavaScriptLanguageProfile extends BaseLanguageProfile {
  constructor() {
    super({
      language: "javascript",
      displayName: "JavaScript",
      extensions: [".js", ".jsx", ".mjs", ".cjs"],
      namingGuidelines: [
        "nomes devem compensar a ausencia de tipos estaticos",
        "variaveis genericas como data, item e result precisam de contexto",
      ],
      errorHandlingGuidelines: [
        "funcoes async devem tratar rejeicoes relevantes",
        "callbacks precisam encaminhar erros para a camada chamadora",
      ],
      resourceLeakGuidelines: [
        "timers, streams e listeners precisam ser encerrados quando aplicavel",
        "clientes HTTP ou conexoes abertas precisam ter owner claro",
      ],
      securityGuidelines: [
        "evitar eval, Function dinamico e command injection",
        "evitar query SQL concatenada",
        "nao registrar dados sensiveis em console ou logger",
      ],
    });
  }
}
