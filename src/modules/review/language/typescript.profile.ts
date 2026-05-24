import { BaseLanguageProfile } from "./language-profile";

export class TypeScriptLanguageProfile extends BaseLanguageProfile {
  constructor() {
    super({
      language: "typescript",
      displayName: "TypeScript",
      extensions: [".ts", ".tsx"],
      namingGuidelines: [
        "nomes devem expressar intencao de dominio",
        "tipos e interfaces precisam evitar abreviacoes opacas",
        "funcoes async devem indicar efeito ou acao executada",
      ],
      errorHandlingGuidelines: [
        "validacoes com Zod devem tratar safeParse sem pular tipos",
        "erros devem ser propagados para o middleware global",
        "promises precisam ser aguardadas ou retornadas",
      ],
      resourceLeakGuidelines: [
        "clientes externos e conexoes precisam ter ciclo de vida claro",
        "streams e handles precisam de cleanup em fluxos com falha",
      ],
      securityGuidelines: [
        "evitar SQL com template literal interpolado",
        "nao registrar tokens, cpf, senha ou dados pessoais em logs",
        "evitar eval, Function dinamico e entrada externa sem validacao",
      ],
    });
  }
}
