# CPJ-Cobranca API AI

API do case técnico CPJ-Cobrança para revisão de código, validação de aderência, documentação, geração de testes e execução em lote usando agentes de IA (LangGraph + OpenRouter).

## Funcionalidades

- **Revisão de código** multi-linguagem (TypeScript, JavaScript, Python, PHP) usando agentes especialistas paralelos com roteamento por linguagem
- **Review de Pull Request** via GitHub, com padrões TR, aderência ao projeto, segurança e critérios Jira opcionais
- **Avaliação de aderência** entre tarefa e código implementado via fluxo `compliance`
- **Documentação técnica ou operacional** gerada a partir de código via fluxo `document`
- **Geração de testes** via fluxo `tests`, com casos classificados e arquivo de teste
- **Geração de testes por Pull Request** via GitHub, criando testes unitarios para funcoes criticas alteradas
- **Execução em lote** via fluxo `batch`, orquestrando `review`, `compliance`, `document` e `tests`
- **Gestão de prompts no banco** — cadastro, consulta, ativação e override por versão via `prompt_version`
- **Catálogo de modelos no banco** — cadastro, edição, exclusão e seleção de modelo padrão global com override por request via `model`
- **Grafos LangGraph** — orquestração de agentes especialistas (segurança, complexidade, resource leak, error handling, naming/clarity) com agregador final
- **Ferramentas determinísticas** — análise estática complementar (regex patterns, lint-like checks)
- **Histórico de execuções** — persistência em PostgreSQL via Prisma com steps e telemetria
- **Suporte a cache** — hash da requisição + rate limiting integrado
- **Retry configurável com backoff** — novas tentativas em chamadas externas e LLM para falhas transitórias
- **OpenAPI/Swagger UI** — docs interativos em `/docs`
- **Painel admin Next.js** — console em `apps/web` para historico, prompts, modelos, custos, tokens e execucao guiada
- **OpenRouter** — provedor LLM multi-modelo
- **LangSmith** — tracing opcional (desligado por padrão)
- **Webhook opcional** — callback ao concluir ou falhar execucoes de review/compliance/document/tests

## Estado Atual

Os fluxos `review`, `compliance`, `document`, `tests` e `batch` estao implementados com endpoint HTTP, Docker Compose e documentacao OpenAPI. Alem deles, o fluxo `pull_request_review` busca contexto no GitHub e Jira opcional, e o endpoint de testes por Pull Request gera testes unitarios para funcoes criticas alteradas. Os fluxos individuais possuem cache por hash, webhook opcional, historico persistido e telemetria do OpenRouter. O fluxo `review` tambem possui streaming SSE, o `batch` executa os fluxos prontos em sequencia com resumo persistido e metadados por item, os prompts ativos passam a ser resolvidos de tabelas versionadas no PostgreSQL e o modelo LLM usado em cada execucao sai de um catalogo persistido com padrao global configuravel.

## Stack

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Runtime    | Node.js 22 + TypeScript 5.9         |
| Framework  | Fastify 5                           |
| ORM        | Prisma + PostgreSQL 16              |
| Agentes    | LangGraph.js + LangChain.js         |
| LLM        | OpenRouter (ChatOpenRouter)         |
| Build      | tsup                                |
| Testes     | Vitest                              |
| Lint       | ESLint 9 (flat config)              |
| Container  | Docker + Compose                    |
| Frontend   | Next.js 16 + React 19 + Ant Design 6 |

## Decisoes tecnicas

- **TypeScript + Zod**: mantém contratos HTTP, respostas estruturadas dos agentes e tipos internos alinhados ao enunciado do case.
- **Fastify**: entrega uma API leve, com validação por schema, bom desempenho e integração simples com OpenAPI/Swagger.
- **PostgreSQL + Prisma**: persiste histórico, steps de execução, cache por hash e telemetria sem acoplar a API ao SQL bruto.
- **LangGraph.js + LangChain.js**: modela os fluxos como grafos explícitos, separando tools determinísticas, agentes especialistas, agregação e persistência de steps.
- **OpenRouter**: mantém integração de chat e structured output, enquanto a escolha do modelo fica centralizada em catálogo persistido no banco.
- **LangSmith opcional**: tracing fica disponível por configuração, sem bloquear execução local ou Docker quando não houver chave.
- **Retry com backoff**: chamadas ao LLM, OpenRouter, GitHub, Jira e webhook são repetidas em falhas transitórias, com tentativas e delay base configuráveis por ambiente.
- **Docker Compose**: sobe API e banco com migrations e seed inicial aplicados antes do start da API.

## Custo estimado

O modelo padrão do `.env.example` é `openai/gpt-4o-mini`. Em 25/05/2026, a página de pricing do OpenRouter para esse modelo informa cerca de **US$0.15 por 1M tokens de entrada** e **US$0.60 por 1M tokens de saída**: [OpenRouter pricing](https://openrouter.ai/openai/gpt-4o-mini/pricing).

Na prática, os exemplos em `requests/cpj-cobranca-api.http` tendem a custar centavos de dólar para uma rodada completa, assumindo códigos pequenos como os do case. O custo real aparece na telemetria persistida quando o provedor retorna `openrouterGenerationId`, tokens e `costUsd`.

## Quick Start (desenvolvimento local)

```bash
# 1. Instalar dependências
npm install

# 2. Subir PostgreSQL
docker compose up -d postgres

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env e adicione OPENROUTER_API_KEY

# 4. Rodar migrations e seed inicial
npx prisma migrate dev --name init
npx prisma db seed

# 5. Iniciar servidor em modo dev
npm run dev

# 6. Em outro terminal, iniciar o painel web
npm run dev:web
```

Acesse a API em `http://localhost:3000/health` e `http://localhost:3000/docs`.
O painel web roda em `http://localhost:3001` e usa `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` por padrao.
Exemplos manuais completos estao em `requests/cpj-cobranca-api.http`.

## Docker (produção)

```bash
# Preparar variaveis de ambiente
cp .env.example .env
# Edite .env e adicione OPENROUTER_API_KEY

# Build e start completo (API + PostgreSQL + painel web)
docker compose up --build -d

# Ver logs
docker compose logs -f api
```

> **Atenção:** a `DATABASE_URL` em Docker aponta para o serviço `postgres` automaticamente.  
> Em ambiente local (sem Docker), use `localhost`. Veja `.env.example`.
> O container da API executa `prisma migrate deploy` e `prisma db seed` antes de iniciar o servidor.

## Endpoints

| Método | Rota                | Descrição                          |
|--------|---------------------|------------------------------------|
| GET    | `/health`           | Health check                       |
| POST   | `/api/v1/review`    | Executa revisão de código          |
| POST   | `/api/v1/review/stream` | Executa revisão via Server-Sent Events |
| POST   | `/api/v1/review/pull-request` | Executa review de Pull Request do GitHub |
| POST   | `/api/v1/compliance` | Avalia aderência entre tarefa e código |
| POST   | `/api/v1/document` | Gera documentação técnica ou operacional |
| POST   | `/api/v1/tests`    | Gera arquivo e casos de teste     |
| POST   | `/api/v1/tests/pull-request` | Gera testes unitarios baseados em Pull Request |
| POST   | `/api/v1/batch`    | Executa varios fluxos em sequencia     |
| GET    | `/api/v1/history`   | Lista últimas execuções            |
| GET    | `/api/v1/history/:id` | Detalhes de uma execução         |
| GET    | `/api/v1/analytics/usage` | Agrega gastos e consumo de tokens |
| GET    | `/api/v1/prompts` | Lista versoes de prompt por fluxo |
| GET    | `/api/v1/prompts/:flowType/active` | Busca a versao ativa do fluxo |
| GET    | `/api/v1/prompts/:flowType/:version` | Busca uma versao especifica |
| POST   | `/api/v1/prompts` | Cadastra nova versao de prompt |
| POST   | `/api/v1/prompts/:flowType/:version/activate` | Ativa uma versao de prompt |
| GET    | `/api/v1/models` | Lista modelos cadastrados |
| GET    | `/api/v1/models/default` | Busca o modelo padrao global |
| POST   | `/api/v1/models` | Cadastra um modelo |
| PATCH  | `/api/v1/models/:id` | Edita nome, status ou define como padrao |
| DELETE | `/api/v1/models/:id` | Exclui um modelo nao padrao |
| GET    | `/docs`             | Swagger UI (OpenAPI)               |

### POST /api/v1/review

```json
{
  "code": "function sum(a, b) { return a + b; }",
  "language": "typescript",
  "context": "Descrição opcional do contexto",
  "model": "openai/gpt-4o-mini"
}
```

Resposta:

```json
{
  "overall_quality": "needs_improvement",
  "score": 7,
  "issues": [
    {
      "severity": "medium",
      "line_hint": "linha 2",
      "description": "A funcao nao valida os tipos de entrada antes de somar.",
      "suggestion": "Valide ou tipifique os parametros de entrada conforme o contrato esperado."
    }
  ],
  "positives": ["Funcao pequena e facil de entender."],
  "summary": "O codigo e simples, mas precisa de validacao ou contrato de tipos mais claro."
}
```

**Languages suportados:** `typescript`, `javascript`, `python`, `php`

### POST /api/v1/review/stream

Usa o mesmo payload do `/api/v1/review` e responde como `text/event-stream`, emitindo eventos `started`, `step`, `result`, `error` e `done`.

### POST /api/v1/review/pull-request

```json
{
  "github_pull_request_url": "https://github.com/org/repo/pull/123",
  "jira_issue_key": "CPJ-123",
  "base_branch": "main",
  "prompt_version": 1,
  "model": "openai/gpt-4o-mini"
}
```

`jira_issue_key` e opcional. Quando ele nao vem, a API nao consulta Jira e retorna `sections.jira_criteria.status` como `skipped`. Os padroes TR usados nessa analise ficam versionados no projeto em `code-standards/`.

### POST /api/v1/compliance

```json
{
  "task_description": "Permitir renegociacao apenas para contratos ativos e registrar auditoria.",
  "code": "if (contract.active) { renegotiate(contract); audit(contract.id); }",
  "language": "typescript",
  "model": "deepseek/deepseek-v4-flash"
}
```

Resposta:

```json
{
  "compliant": true,
  "compliance_score": 95,
  "covered_requirements": ["Valida contrato ativo antes da renegociacao."],
  "missing_requirements": [],
  "partial_requirements": [],
  "verdict": "Aderente."
}
```

### POST /api/v1/document

```json
{
  "code": "export function charge(amount: number) { return amount > 0; }",
  "language": "typescript",
  "doc_type": "technical",
  "model": "openai/gpt-4o-mini"
}
```

Resposta:

```json
{
  "doc_type": "technical",
  "title": "Servico de cobranca",
  "description": "Valida se uma cobranca possui valor positivo.",
  "inputs": [
    {
      "name": "amount",
      "type": "number",
      "description": "Valor da cobranca."
    }
  ],
  "outputs": [
    {
      "name": "return",
      "type": "boolean",
      "description": "Indica se o valor e positivo."
    }
  ],
  "side_effects": [],
  "usage_example": "charge(100)",
  "notes": null
}
```

### POST /api/v1/tests

```json
{
  "code": "export function charge(amount: number) { return amount > 0; }",
  "language": "typescript",
  "test_framework": "vitest",
  "model": "deepseek/deepseek-v4-flash"
}
```

Resposta:

```json
{
  "framework": "vitest",
  "test_file": "import { expect, it } from 'vitest';\nimport { charge } from './charge';\n\nit('retorna true para valor positivo', () => {\n  expect(charge(100)).toBe(true);\n});",
  "test_cases": [
    {
      "name": "retorna true para valor positivo",
      "type": "happy_path",
      "description": "Valida a regra principal."
    }
  ],
  "coverage_hints": ["Adicionar teste para amount <= 0 quando houver regra de erro."]
}
```

### POST /api/v1/tests/pull-request

```json
{
  "github_pull_request_url": "https://github.com/org/repo/pull/123",
  "base_branch": "main",
  "test_framework": "vitest",
  "model": "openai/gpt-4o-mini"
}
```

Busca o PR no GitHub, infere a linguagem principal pelos arquivos alterados, identifica funcoes/branches/casos de erro criticos no diff e retorna um arquivo de teste unitario no framework informado.

Resposta igual ao endpoint `/api/v1/tests`:

```json
{
  "framework": "vitest",
  "test_file": "import { describe, expect, it } from 'vitest';\n...",
  "test_cases": [],
  "coverage_hints": []
}
```

### POST /api/v1/batch

Executa itens de `review`, `compliance`, `document` e `tests` em sequencia. Use `continue_on_error=false` para interromper no primeiro item com falha. Cada item retorna `execution_id` e `cache_hit` quando o fluxo roda com persistencia; a rastreabilidade detalhada dos subfluxos tambem fica em `/api/v1/history`.

```json
{
  "continue_on_error": true,
  "notify": false,
  "items": [
    {
      "flow_type": "review",
      "payload": {
        "code": "function sum(a, b) { return a + b; }",
        "language": "javascript"
      }
    },
    {
      "flow_type": "tests",
      "payload": {
        "code": "export function charge(amount: number) { return amount > 0; }",
        "language": "typescript",
        "test_framework": "vitest"
      }
    }
  ]
}
```

Cada `payload` de item tambem pode informar `prompt_version` para sobrescrever o prompt ativo apenas naquela execucao e `model` para trocar o modelo padrao global por item.

### Prompt versioning

Prompts ficam na tabela `PromptVersion`, agrupados por `flowType` + `version`. O fluxo usa a versao ativa por padrao, mas qualquer request individual pode informar `prompt_version` para forcar uma versao especifica.

Exemplo de cadastro:

```json
{
  "flow_type": "document",
  "name": "Document v2",
  "blocks": [
    {
      "block_key": "agent",
      "system_prompt": "Voce gera documentacao tecnica usando o contexto {{language_context}}."
    }
  ]
}
```

Exemplo de ativacao:

```http
POST /api/v1/prompts/document/2/activate
```

### Model catalog

Modelos permitidos ficam nas tabelas `RegisteredModel` e `GlobalModelSettings`. A API usa o modelo padrao global quando o campo `model` nao e informado, e rejeita qualquer nome que nao esteja cadastrado ou esteja inativo.

Seed inicial:

- `openai/gpt-4o-mini`
- `deepseek/deepseek-v4-flash`

Modelo padrao inicial:

- `openai/gpt-4o-mini`

Exemplo de cadastro:

```json
{
  "name": "anthropic/claude-3.5-haiku"
}
```

Exemplo de edicao para virar padrao:

```json
{
  "is_default": true
}
```

Resposta:

```json
{
  "batch_id": "uuid-do-batch",
  "status": "success",
  "results": [
    {
      "index": 0,
      "flow_type": "review",
      "execution_id": "execution-review-1",
      "status": "success",
      "cache_hit": false,
      "output": {
        "overall_quality": "good",
        "score": 9,
        "issues": [],
        "positives": ["Codigo simples e legivel."],
        "summary": "Sem problemas relevantes."
      },
      "error_message": null
    },
    {
      "index": 1,
      "flow_type": "tests",
      "execution_id": "execution-tests-1",
      "status": "success",
      "cache_hit": true,
      "output": {
        "framework": "vitest",
        "test_file": "import { expect, it } from 'vitest';\nimport { charge } from './charge';",
        "test_cases": [],
        "coverage_hints": []
      },
      "error_message": null
    }
  ]
}
```

### Webhook opcional

Quando `WEBHOOK_CALLBACK_URL` estiver configurado, cada execucao de `review`, `compliance`, `document` ou `tests` envia um `POST` JSON para a URL ao finalizar com sucesso ou falha. Falhas no callback sao registradas no historico como step `webhook_callback`, mas nao alteram a resposta principal.

```json
{
  "flow_type": "review",
  "execution_id": "execution-id",
  "status": "success",
  "cache_hit": false,
  "output": {
    "overall_quality": "good",
    "score": 9,
    "issues": [],
    "positives": ["Codigo simples e legivel."],
    "summary": "Sem problemas relevantes."
  }
}
```

## Ambiente

| Variável                     | Exemplo                                           | Obrigatório |
|------------------------------|---------------------------------------------------|-------------|
| `DATABASE_URL`               | `postgresql://postgres:postgres@localhost:5432/...` | ✅          |
| `OPENROUTER_API_KEY`         | `sk-or-...`                                       | ✅          |
| `OPENROUTER_DEFAULT_MODEL`   | `openai/gpt-4o-mini`                              | ✅          |
| `EXTERNAL_RETRY_ATTEMPTS`    | `2`                                               | ❌          |
| `EXTERNAL_RETRY_BASE_DELAY_MS` | `250`                                           | ❌          |
| `GITHUB_TOKEN`               | `ghp_...`                                         | ✅ para PR review |
| `JIRA_BASE_URL`              | `https://empresa.atlassian.net`                   | ❌          |
| `JIRA_EMAIL`                 | `dev@empresa.com`                                 | ❌          |
| `JIRA_API_TOKEN`             | `jira-token`                                      | ❌          |
| `HOST`                       | `0.0.0.0`                                         | ❌          |
| `PORT`                       | `3000`                                            | ❌          |
| `LANGSMITH_TRACING`          | `false`                                           | ❌          |
| `LANGSMITH_API_KEY`          | `lsv2_...`                                        | ❌          |
| `LANGSMITH_PROJECT`          | `cpj-cobranca-api-ai`                             | ❌          |
| `WEBHOOK_CALLBACK_URL`       | `https://example.com/webhook/cpj-cobranca`        | ❌          |

> Variáveis LangSmith são opcionais. Para ativar tracing, defina `LANGSMITH_TRACING=true` e informe `LANGSMITH_API_KEY`.
> `OPENROUTER_DEFAULT_MODEL` continua existindo como fallback operacional, mas a fonte principal do modelo em runtime agora e o catalogo persistido no banco com padrao global.
> Quando `WEBHOOK_CALLBACK_URL` estiver configurado, a API envia um `POST` JSON com `flow_type`, status, `execution_id`, `cache_hit` e resultado ou erro do fluxo.

## O que eu faria com mais tempo

- Adicionar streaming SSE também para `/api/v1/document`, embora o diferencial de streaming já esteja coberto em `/api/v1/review/stream`.
- Criar uma suíte de avaliação com fixtures maiores por linguagem e snapshots de qualidade dos agentes.
- Adicionar retry/backoff configurável para chamadas ao provedor LLM e webhook externo.
- Oferecer modo local com Ollama para reduzir custo em ambientes de avaliação sem chave paga.

## Estrutura do Projeto

```
src/
├── app.ts                          # App assembly (Fastify, plugins, rotas)
├── server.ts                       # Entrypoint
├── infrastructure/
│   ├── database/                   # Prisma plugin
│   ├── logging/                    # Logger (pino)
│   └── openapi/                    # OpenAPI/Swagger setup
├── modules/
│   ├── health/                     # Health check
│   ├── compliance/                 # Avaliacao de aderencia tarefa x codigo
│   ├── document/                   # Documentacao tecnica de codigo
│   ├── tests/                      # Geracao de estrategia e codigo de testes
│   ├── batch/                      # Orquestracao sequencial dos fluxos
│   ├── review/
│   │   ├── engines/                # Review engine principal
│   │   ├── graphs/                 # LangGraph (review-flow, review-language, per-language)
│   │   ├── agents/                 # Agentes especialistas
│   │   ├── tools/                  # Ferramentas determinísticas
│   │   ├── routes/                 # POST /api/v1/review
│   │   ├── controllers/            # Controller
│   │   └── services/               # Service layer
│   ├── history/                    # Histórico de execuções
│   ├── executions/                 # Persistência (repositories)
│   └── agent/
│       ├── llm/                    # OpenRouter factory + structured output runner
│       └── telemetry/              # Coletor de telemetria
├── shared/
│   ├── config/                     # Env loading + validação
│   ├── contracts/                  # Zod schemas compartilhados
│   ├── middlewares/                # Error handler, request context, security
│   └── utils/                      # Hash, date
tests/                              # Testes Vitest
prisma/
├── schema.prisma                   # Modelo de dados
└── migrations/                     # Migrations
```

## Comandos

| Comando              | Descrição                          |
|----------------------|------------------------------------|
| `npm run dev`        | Dev server com hot reload (tsx)    |
| `npm run build`      | Build para produção (tsup)         |
| `npm start`          | Inicia servidor buildado           |
| `npm test`           | Roda testes (Vitest)               |
| `npm run typecheck`  | TypeScript type checking           |
| `npm run lint`       | ESLint                             |
| `npm run prisma:generate` | Gera Prisma Client            |
| `npm run prisma:migrate`  | Cria migration (dev)           |
| `npm run prisma:deploy`   | Aplica migrations em ambiente buildado |
