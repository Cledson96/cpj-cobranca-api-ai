import { BaseLanguageProfile } from "./language-profile";

export class PythonLanguageProfile extends BaseLanguageProfile {
  constructor() {
    super({
      language: "python",
      displayName: "Python",
      extensions: [".py"],
      namingGuidelines: [
        "nomes devem seguir snake_case e revelar regra de negocio",
        "classes devem expressar responsabilidade unica",
      ],
      errorHandlingGuidelines: [
        "except amplo precisa justificar ou relancar erro",
        "falhas de I/O devem ter tratamento explicito",
      ],
      resourceLeakGuidelines: [
        "arquivos, cursores e conexoes devem usar context manager quando possivel",
        "requests e sessoes precisam de timeout e fechamento quando aplicavel",
      ],
      securityGuidelines: [
        "evitar eval, exec, pickle inseguro e subprocess com shell=True",
        "evitar SQL formatado com f-string ou %",
        "nao registrar segredos ou dados pessoais em logs",
      ],
    });
  }
}
