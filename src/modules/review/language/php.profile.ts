import { BaseLanguageProfile } from "./language-profile";

export class PhpLanguageProfile extends BaseLanguageProfile {
  constructor() {
    super({
      language: "php",
      displayName: "PHP",
      extensions: [".php"],
      namingGuidelines: [
        "nomes devem deixar claro se a funcao consulta, altera ou valida estado",
        "variaveis vindas de request precisam ter nomes de origem claros",
      ],
      errorHandlingGuidelines: [
        "operacoes de banco e arquivos devem tratar falhas sem esconder erro",
        "exceptions devem ser propagadas para a camada de resposta",
      ],
      resourceLeakGuidelines: [
        "handles de arquivo e conexoes precisam ser fechados quando aplicavel",
        "recursos externos devem ter timeout e cleanup definidos",
      ],
      securityGuidelines: [
        "evitar mysqli_query ou PDO com concatenacao de entrada externa",
        "evitar include dinamico com dados de request",
        "nao expor dados sensiveis com var_dump, print_r ou error_log",
      ],
    });
  }
}
