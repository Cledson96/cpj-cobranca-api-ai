# Manual de Desenvolvimento TR Padrão — Node.js com TypeScript

Este documento define as regras de desenvolvimento, arquitetura, convenções de código e nomenclatura para projetos em **Node.js com TypeScript** na **TR Padrão** (Juscash). Estas práticas foram extraídas e consolidadas de projetos de produção consolidados (`api_processos` e `sistema_juscash_api`).

---

## 1. Visão Geral da Arquitetura

Nossos projetos seguem uma **Arquitetura Modular baseada em Camadas (Layered Modular Architecture)**. A organização do projeto visa isolar as responsabilidades, maximizar a testabilidade e facilitar o reaproveitamento de código em módulos de negócio independentes.

```
       ┌────────────────────────────────────────────────────────┐
       │                   Presentation Layer                   │
       │     (Routes, Controllers, Validation, Middlewares)     │
       └────────────────────────────────────────────────────────┘
                                    ↓
       ┌────────────────────────────────────────────────────────┐
       │                     Business Layer                     │
       │                   (Services, Models)                   │
       └────────────────────────────────────────────────────────┘
                                    ↓
       ┌────────────────────────────────────────────────────────┐
       │                  Infrastructure Layer                  │
       │     (Database/Prisma, Redis, Logging, BullMQ, Mail)    │
       └────────────────────────────────────────────────────────┘
```

### 1.1 Stack Tecnológica Padronizada
- **Runtime**: Node.js (versão 20+ LTS) com TypeScript (versão 5+)
- **Framework Web**: Express (versão 5+)
- **Acesso ao Banco de Dados**: Prisma ORM utilizando o pacote corporativo de schemas `@Juscash/db-sij`
- **Cache & Filas**: Redis (`ioredis`) & BullMQ para processamento em segundo plano (background jobs)
- **Validação de Dados**: Zod
- **Sistema de Logs**: Winston com rotação diária de arquivos (`winston-daily-rotate-file`)
- **Documentação de API**: OpenAPI / Swagger (`swagger-jsdoc` e `swagger-ui-express`)

---

## 2. Estrutura de Diretórios do Projeto

A raiz do diretório `src/` deve conter a seguinte estrutura organizacional:

```
src/
├── infrastructure/           # Camada de infraestrutura de baixo nível
│   ├── database/             # Conexões e gerenciadores de bancos (Prisma, Redis)
│   ├── logging/              # Configuração do Winston Logger e Morgan
│   ├── email/                # Serviços de envio de e-mails e templates
│   └── queues/               # Configuração global de inicialização de filas
│
├── modules/                  # Módulos de domínio de negócio (funcionalidades isoladas)
│   ├── analise-ml/           # Exemplo de módulo: Análise de Machine Learning
│   ├── processo/             # Exemplo de módulo: Consulta de Processos
│   └── index.ts              # Exportador agregado de todos os módulos
│
├── shared/                   # Recursos globais e transversais compartilhados
│   ├── config/               # Variáveis de ambiente (Env) e configurações estáticas
│   ├── constants/            # Constantes globais do sistema
│   ├── errors/               # Definição e tratamento global de erros (AppError)
│   ├── middlewares/          # Middlewares globais (segurança, parser, CORS, etc.)
│   ├── routes/               # Centralizador e inicializador de rotas da aplicação
│   ├── types/                # Definições de tipos globais do TypeScript
│   └── utils/                # Funções utilitárias auxiliares globais
│
├── index.ts                  # Ponto de entrada (Entrypoint)
└── server.ts                 # Inicializador e configurações do servidor Express (App Class)
```

---

## 3. Padrão de Arquitetura de Módulos

Cada funcionalidade ou domínio deve ser encapsulado dentro de um diretório em `src/modules/{modulo}`. O módulo deve ser auto-suficiente, contendo suas rotas, controllers, regras de negócio e integrações específicas.

### 3.1 Estrutura Interna do Módulo
```
modules/{nome-modulo}/
├── constants/        # Constantes internas exclusivas do módulo
├── controllers/      # Controladores HTTP (validação rápida de entrada, resposta formatada)
├── services/         # Regras de negócio, cálculos, chamadas de repositórios e APIs externas
├── repositories/     # Consultas específicas a banco de dados (abstração do Prisma)
├── routes/           # Mapeamento de endpoints HTTP para métodos de controllers
├── schemas/          # Esquemas Zod para validação de requisições (body, query, params)
├── models/           # Tipos de dados e contratos locais do TypeScript
├── workers/          # Background workers locais (BullMQ) para processamento assíncrono
├── queues/           # Inicialização de filas locais (BullMQ)
├── utils/            # Utilitários de domínio específicos do módulo
├── docs/             # Documentação em Swagger (OpenAPI annotations ou schemas)
└── index.ts          # Arquivo de exportação pública das rotas e componentes
```
> *Nota: Nem todos os módulos precisam de todas as subpastas. Crie apenas as pastas necessárias para o escopo do módulo.*

### 3.2 Regra de Exportação do Módulo
O arquivo `index.ts` na raiz do módulo deve exportar apenas as rotas e instâncias que precisam ser acessadas de fora do módulo:
```typescript
// src/modules/analise-ml/index.ts
export * from "./routes";
```

O arquivo `src/modules/index.ts` agrega as exportações de todos os módulos:
```typescript
// src/modules/index.ts
export * from "./processo";
export * from "./analise-ml";
```

E as rotas globais são registradas no agregador global `src/shared/routes/index.ts`:
```typescript
// src/shared/routes/index.ts
import { Router } from "express";
import { analiseMlRoutes } from "@/modules/analise-ml";
import { processoRoutes } from "@/modules/processo";

class AppRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.use("/analise-ml", analiseMlRoutes.router);
    this.router.use("/processo", processoRoutes.router);
  }
}

export const routes = new AppRoutes();
```

---

## 4. Convenções de Nomenclatura

Para manter a consistência estética e a semântica do código, adote rigorosamente as seguintes diretrizes:

### 4.1 Classes
Use **`PascalCase`**. Nomes de classes devem incluir o sufixo correspondente à camada.
- `AnaliseMlController` (Camada de Apresentação)
- `ScoreClientesService` (Camada de Lógica de Negócio)
- `AnaliseMlRepository` (Camada de Acesso a Dados)
- `SchemasAnaliseMl` (Classe de Validação Zod)

### 4.2 Métodos e Funções
Use **`camelCase`**. Devem iniciar com verbos indicando a ação realizada.
- `listarProcessosMl` (Buscar múltiplos itens)
- `consolidarScoreClientes` (Realizar uma operação de consolidação)
- `adicionarProcessos` (Inserir dados ou enfileirar tarefas)
- `obterFilaUsuario` (Buscar dado específico)

### 4.3 Variáveis e Parâmetros
Use **`camelCase`**. Evite abreviações confusas; o nome deve ser descritivo e autocomplementar.
- `usuarioId` (e não `uid` ou `usr_id`)
- `oabRaw` (dados originais sem formatação)
- `dataUltimaAvaliacao`

> [!IMPORTANT]  
> Variáveis vindas de requisições externas (como parâmetros de query ou chaves de banco de dados legados) podem usar `snake_case` (ex: `data_inicial`, `id_usuario`). No entanto, sempre que possível, faça o mapeamento e a coerção para `camelCase` dentro do Controller ou no parsing do Zod Schema.

### 4.4 Constantes
Use **`UPPER_SNAKE_CASE`** para constantes de arquivo ou de escopo global.
- `MAX_RETRIES_PLOOMES = 3`
- `RETRY_DELAY_MS = 2000`
- `CLASSIFICACOES_PADRAO_SEM_OBSERVACAO = ["Aprovado", "Recusado"]`

### 4.5 Interfaces e Tipos (TypeScript)
Use **`PascalCase`**. Evite prefixar com `I` (ex: `IProcesso`). Nomes devem ser autoexplicativos sobre o papel do tipo.
- `ProspectScoreDashboardItem`
- `PloomesContexto`
- `AnaliseMlMotorCreate` (Sufixo para ações de criação)
- `AnaliseMlClassificacaoUpdate` (Sufixo para ações de atualização)

### 4.6 Arquivos e Pastas
- **Arquivos**: Use **`camelCase`** (ex: `dateUtils.ts`, `responseFormatter.ts`) ou **`kebab-case`** para múltiplos termos (ex: `analise-ml-leads.ts`). O arquivo principal de exportação e definição de inicialização do diretório sempre deve ser `index.ts`.
- **Pastas**: Use **`kebab-case`** para diretórios de módulos ou de infraestrutura (ex: `analise-ml`, `response-formatter`).

---

## 5. Padrões de Código e Implementação por Camada

### 5.1 Camada de Apresentação: Controllers
Os controladores HTTP devem ser exclusivamente responsáveis por lidar com a requisição Express, chamar o serviço adequado e retornar a resposta formatada. **Nunca coloque lógica de negócio no Controller.**

#### Regras Obrigatórias para Controllers:
1. **Tratamento de Erros**: Todo método deve conter um bloco `try/catch`. O erro deve ser repassado ao middleware global via `next(error)` após registrar logs informativos apropriados.
2. **Métodos de Resposta customizados**: Nunca responda usando `res.status().json()`. Utilize os métodos customizados estendidos do objeto `Response` (detalhados na seção 5.6).
3. **Singleton Pattern**: Exporte uma instância única do controller da classe.
4. **Binding de Contexto**: Ao declarar as rotas, faça o bind da função para preservar o escopo (`.bind(controllerInstance)`).

```typescript
// src/modules/analise-ml/controllers/index.ts
import { Request, Response, NextFunction } from "express";
import { Logger } from "@/shared/utils";
import { analiseMlService } from "../services";
import { AnaliseMlMotorCreate } from "../models";

export class AnaliseMlController {
  public async createMotor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: AnaliseMlMotorCreate = req.body;
      
      // Chamada de serviço com lógica de negócio
      const created = await analiseMlService.createMotor(payload);
      
      // Uso obrigatório de método de resposta padronizado
      res.created(created, "Motor ML criado com sucesso");
    } catch (error) {
      Logger.error("Erro ao criar motor de Análise ML", error);
      next(error); // Repasse do erro para o middleware global
    }
  }
}

// Exportação da instância singleton do Controller
export const analiseMlController = new AnaliseMlController();
```

---

### 5.2 Camada de Negócio: Services
Os serviços contêm toda a lógica de negócio pura, interações entre modelos, regras fiscais/judiciais e chamadas de integrações.

#### Regras Obrigatórias para Services:
1. **Isolamento de Infraestrutura**: Não manipule objetos diretos do Express (`Request`, `Response`) dentro de um serviço. Receba parâmetros primitivos ou interfaces TypeScript limpas.
2. **Propagação de Erros**: Sempre use `try/catch` para capturar erros. Faça o log do erro com `Logger.error` e use `throw error` para relançar o erro, permitindo que a camada superior decida como tratá-lo.
3. **Singleton Pattern**: Exporte uma instância única do serviço.

```typescript
// src/modules/analise-ml/services/score-clientes/index.ts
import { Logger } from "@/shared/utils";
import { analiseMlRepository } from "../../repositories";
import ploomesService from "@/modules/ploomes/services/api-ploomes";

export class ScoreClientesService {
  public async consolidarScoreClientes(params: {
    idIndividuo: number;
    idContactPloomes: string;
    scores: number[];
  }): Promise<void> {
    const { idIndividuo, idContactPloomes, scores } = params;

    try {
      if (scores.length === 0) {
        Logger.warn(`Nenhum score para consolidar — id_individuo: ${idIndividuo}`);
        return;
      }

      const mediaScores = scores.reduce((acc, s) => acc + s, 0) / scores.length;
      const scorePercentual = Math.round(mediaScores * 100);

      // Persistência local no banco via repositório do módulo
      await analiseMlRepository.updateIndividuoScore({
        idIndividuo,
        score: scorePercentual,
        data: new Date(),
      });

      // Atualização no serviço CRM externo
      await ploomesService.updateContact(idContactPloomes, {
        OtherProperties: [
          {
            FieldKey: "score_aprovacao",
            DecimalValue: scorePercentual,
          }
        ]
      });

    } catch (error) {
      Logger.error(`Erro ao consolidar score de clientes — id_individuo: ${idIndividuo}`, error);
      throw error; // Relança o erro estruturado
    }
  }
}

export const scoreClientesService = new ScoreClientesService();
```

---

### 5.3 Camada de Dados: Repositories
Para evitar acoplamento direto com o ORM em múltiplos lugares do mesmo módulo, centralize queries complexas, transações e operações de persistência em arquivos de repositório dedicados.

#### Regras Obrigatórias para Repositories:
1. **Uso do Prisma Client**: Faça o import da conexão globalizada do banco (`import db from "@/infrastructure/database"`).
2. **Tratamento de Erros de Banco**: Envolva as chamadas em blocos `try/catch` e converta as falhas nativas do Prisma em erros operacionais customizados utilizando `throw handlePrismaError(error)`.

```typescript
// src/modules/analise-ml/repositories/index.ts
import db from "@/infrastructure/database";
import { handlePrismaError } from "@/shared/errors";
import { Logger } from "@/shared/utils";

class AnaliseMlRepository {
  public async updateIndividuoScore(params: {
    idIndividuo: number;
    score: number;
    data: Date;
  }): Promise<void> {
    try {
      // Uso de transação estruturada quando aplicável
      await db.$transaction(async (tx) => {
        await tx.individuo.update({
          where: { id: params.idIndividuo },
          data: {
            score_clientes: params.score,
            data_ultima_avaliacao_score: params.data,
          },
        });
      });
    } catch (error) {
      Logger.error(`Erro ao persistir score no banco — id_individuo: ${params.idIndividuo}`, error);
      throw handlePrismaError(error); // Converte erro Prisma em AppError
    }
  }
}

export const analiseMlRepository = new AnaliseMlRepository();
```

---

### 5.4 Validação de Dados: Zod Schemas
Todas as entradas enviadas pelo cliente HTTP (corpo da requisição, query strings e parâmetros de rota) devem ser estritamente validadas em tempo de execução utilizando **Zod Schemas** associados a middlewares utilitários na declaração de rotas.

#### Regras de Validação:
1. Defina os esquemas como métodos de uma classe `Schemas{Modulo}`.
2. Utilize o utilitário `z.coerce` para realizar a coerção automática de dados oriundos da query ou de parâmetros de rota (que por padrão chegam como strings).
3. Proteja os endpoints passando os middlewares globais `validateSchema(schema)`, `validateQuery(schema)` ou `validateParams(schema)`.

```typescript
// src/modules/analise-ml/schemas/index.ts
import { z } from "zod";

export class SchemasAnaliseMl {
  public createMotorSchema() {
    return z.object({
      nome: z.string().min(1, "nome é obrigatório").max(255),
      descricao: z.string().min(1, "descricao é obrigatória").max(800),
      url_api: z.string().url("url_api deve ser uma URL válida"),
      producao: z.boolean().optional().default(false),
    });
  }

  public listarProcessosQuerySchema() {
    return z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      orderBy: z.enum(["created_at", "score"]).default("created_at"),
      order: z.enum(["asc", "desc"]).default("desc"),
      processo: z.string().optional(),
    });
  }
}

export const schemasAnaliseMl = new SchemasAnaliseMl();
```

Associação dos Schemas no roteamento:
```typescript
// src/modules/analise-ml/routes/index.ts
import { Router } from "express";
import { analiseMlController } from "../controllers";
import { validateSchema, validateQuery } from "@/shared/middlewares";
import { schemasAnaliseMl } from "../schemas";

class AnaliseMlRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Validação de Query String
    this.router.get(
      "/",
      validateQuery(schemasAnaliseMl.listarProcessosQuerySchema()),
      analiseMlController.listarProcessosMl.bind(analiseMlController)
    );

    // Validação de Request Body
    this.router.post(
      "/motores",
      validateSchema(schemasAnaliseMl.createMotorSchema()),
      analiseMlController.createMotor.bind(analiseMlController)
    );
  }
}

export const analiseMlRoutes = new AnaliseMlRoutes();
```

---

### 5.5 Tratamento de Erros Customizados (AppError)
A API possui um fluxo global de tratamento de erros robusto. Não retorne strings brutas de erro nem status codes aleatórios. Utilize a árvore de classes derivadas de `AppError` para padronizar os erros do sistema.

A estrutura de erro base define se o erro é operacional (erros conhecidos de input do usuário, validação, etc.) ou sistêmico (erros de infraestrutura inesperados):

```typescript
// src/shared/errors/index.ts
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly cause?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.cause = cause;
    
    Object.setPrototypeOf(this, this.constructor.prototype);
  }
}

// Exemplo de erro de validação (HTTP 422)
export class ValidationError extends AppError {
  constructor(message: string = "Dados de entrada inválidos", cause?: unknown) {
    super(message, 422, true, cause);
  }
}

// Exemplo de recurso não encontrado (HTTP 404)
export class NotFoundError extends AppError {
  constructor(message: string = "Recurso não encontrado", cause?: unknown) {
    super(message, 404, true, cause);
  }
}
```

---

### 5.6 Métodos de Resposta HTTP Padronizados (Response Formatter)
Estendemos a interface global do `Express.Response` para garantir que o formato de retorno do JSON para o cliente da API seja sempre o mesmo.

#### Formato do JSON de Sucesso (200 OK / 201 Created):
```json
{
  "success": true,
  "message": "Operação realizada com sucesso",
  "data": { ... },
  "timestamp": "2026-05-24T23:00:00.000Z"
}
```

#### Formato do JSON de Erro (4xx / 5xx):
```json
{
  "success": false,
  "message": "Mensagem amigável descrevendo o erro",
  "error": {
    "code": 404,
    "details": "O recurso solicitado não foi encontrado"
  },
  "timestamp": "2026-05-24T23:00:00.000Z"
}
```

#### Métodos Estendidos Disponíveis:
- `res.success(data, message, statusCode)` (padrão HTTP 200)
- `res.created(data, message)` (padrão HTTP 201)
- `res.error(message, statusCode, details)` (erros de escopo genéricos)
- `res.notFound(message)` (recurso inexistente, HTTP 404)
- `res.badRequest(message, details)` (parâmetros incorretos, HTTP 400)
- `res.unauthorized(message)` (falha de credencial, HTTP 401)
- `res.forbidden(message)` (permissão insuficiente, HTTP 403)

---

### 5.7 Diretrizes Rigorosas de Logging (Winston)
A rastreabilidade de falhas é um pilar crítico de nossa arquitetura. **O uso de logs é obrigatório.**

#### Regras de Logging:
1. **Console.log é Proibido**: É expressamente proibido o uso de `console.log()`, `console.error()` ou `console.warn()` em código de produção.
2. **Utilize o Winston Logger**: Sempre importe e chame os métodos estáticos do Logger corporativo (`import { Logger } from "@/shared/utils"`).
3. **Níveis de Log Corretos**:
   - `Logger.error()`: Falhas estruturais, exceções capturadas em catches de controllers/services, erros de conexões externas.
   - `Logger.warn()`: Comportamentos limítrofes, timeout controlado, dados inconsistentes ignorados no processamento.
   - `Logger.info()`: Inicialização de sistemas, término de processamento de filas, requisições externas concluídas com sucesso.
   - `Logger.debug()`: Logs temporários para rastreio local (devem ser removidos ou desativados antes do commit em produção).

```typescript
// Exemplo correto
Logger.error("Falha ao atualizar contato no Ploomes após retentativas", {
  error: ultimoErro,
  idContactPloomes,
  individuoId: contexto.id_individuo,
});
```

---

## 6. Conexões e Ciclo de Vida: DatabaseManager e Graceful Shutdown

Evite criar instâncias de clientes Prisma ou Redis de forma espalhada pela aplicação. Centralizamos o pool de conexões e o ciclo de inicialização sob a classe singleton **`DatabaseManager`**, responsável também por monitorar a saúde da infraestrutura.

O inicializador global gerencia a inicialização paralela e o encerramento gracioso (*Graceful Shutdown*) das conexões e workers em caso de recebimento dos sinais `SIGINT` ou `SIGTERM` do sistema operacional:

```typescript
// src/server.ts (Trecho simplificado do Graceful Shutdown)
private setupGracefulShutdown(): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    Logger.info(`Sinal ${signal} recebido. Iniciando graceful shutdown...`);

    try {
      // 1. Fechar o servidor Express de novas conexões
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        Logger.info("Servidor HTTP fechado com sucesso.");
      }

      // 2. Parar Workers em background (parar novos recebimentos de jobs)
      await workerManager.shutdown();
      Logger.info("Workers parados com sucesso.");

      // 3. Encerrar conexões ativas com Bancos e Redis
      await databaseManager.closeConnections();
      Logger.info("Conexões com banco/Redis fechadas.");

      process.exit(0);
    } catch (error) {
      Logger.error("Erro durante graceful shutdown", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
```

---

## 7. Estrutura de Filas e Processamento Assíncrono (BullMQ)

Para tarefas de processamento pesado, download de documentos e integrações lentas, enfileire a tarefa na fila Redis gerenciada pelo **BullMQ**.

- Crie uma fila (`Queue`) declarando suas propriedades de concorrência e retentativa.
- Crie um processador (`Worker`) correspondente que executará o processamento em segundo plano sem impactar a resposta do endpoint HTTP da API.

```typescript
// Exemplo de inicialização de fila em src/modules/analise-ml/queues/index.ts
import { Queue } from "bullmq";
import { databaseManager } from "@/infrastructure/database";

const connection = databaseManager.createBullMQConnection();

export const analiseMlQueue = new Queue("analise-ml-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5 segundos
    },
    removeOnComplete: { count: 100 }, // Preserva apenas histórico recente
    removeOnFail: { count: 1000 },
  },
});
```

---

## 8. Convenções de Imports

Mantenha os arquivos organizados ordenando os blocos de importações com espaçamento entre categorias:

1. **Dependências Externas** (pacotes instalados via npm)
2. **Aliases Globais** (`@/shared`, `@/modules`, `@/infrastructure`)
3. **Imports Relativos Locais** (`../services`, `./utils`, `./models`)

```typescript
// 1. Dependências externas
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// 2. Aliases corporativos
import { Logger } from "@/shared/utils";
import { ValidationError } from "@/shared/errors";
import { analiseMlService } from "@/modules/analise-ml/services";

// 3. Imports relativos de escopo local
import { schemasAnaliseMl } from "../schemas";
import { formatLocalFields } from "./utils";
```

---

## 9. Checklist para Code Review (Revisão de Código)

Antes de abrir um Pull Request para a branch principal, garanta que seu código atende a todos os pontos abaixo:

- [ ] A pasta do novo recurso segue a estrutura de módulos padrão.
- [ ] O Controller não possui lógica de negócio ou queries de banco.
- [ ] Todas as entradas da requisição (body, query, params) estão validadas por um Zod Schema.
- [ ] Não existem chamadas a `console.log`, `console.warn` ou `console.error` (todos substituídos pelo Winston `Logger`).
- [ ] Todos os métodos assíncronos que possuem interações com banco ou serviços de rede são encapsulados por `try/catch`.
- [ ] Erros operacionais são lançados utilizando instâncias de classes estendidas de `AppError` (`ValidationError`, `NotFoundError`, etc.).
- [ ] As consultas de banco utilizam transação (`$transaction`) em caso de escritas dependentes ou updates múltiplos.
- [ ] Todos os arquivos TypeScript compilam corretamente sem diretivas `@ts-ignore` ou tipos `any` injustificados.
- [ ] Os retornos das requisições HTTP utilizam exclusivamente os formatadores estendidos do Express Response (ex: `res.success`, `res.created`).
