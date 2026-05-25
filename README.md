# CPJ-Cobranca API AI

API do case técnico CPJ-Cobrança para revisão automatizada de código usando agentes de IA (LangGraph + OpenRouter).

## Funcionalidades

- **Revisão de código** multi-linguagem (TypeScript, JavaScript, Python, PHP) usando agentes especialistas paralelos com roteamento por linguagem
- **Grafos LangGraph** — orquestração de agentes especialistas (segurança, complexidade, resource leak, error handling, naming/clarity) com agregador final
- **Ferramentas determinísticas** — análise estática complementar (regex patterns, lint-like checks)
- **Histórico de execuções** — persistência em PostgreSQL via Prisma com steps e telemetria
- **Suporte a cache** — hash da requisição + rate limiting integrado
- **OpenAPI/Swagger UI** — docs interativos em `/docs`
- **OpenRouter** — provedor LLM multi-modelo
- **LangSmith** — tracing opcional (desligado por padrão)
- **Webhook opcional** — callback ao concluir ou falhar uma execucao de review

## Estado Atual

O fluxo `review` esta implementado com endpoint HTTP, streaming SSE, cache por hash, webhook opcional, historico persistido, telemetria do OpenRouter e Docker Compose. Os fluxos `compliance`, `document`, `tests` e `batch` ainda estao fora do escopo entregue nesta fase.

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

## Quick Start (desenvolvimento local)

```bash
# 1. Instalar dependências
npm install

# 2. Subir PostgreSQL
docker compose up -d postgres

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env e adicione OPENROUTER_API_KEY

# 4. Rodar migrations
npx prisma migrate dev --name init

# 5. Iniciar servidor em modo dev
npm run dev
```

Acesse em `http://localhost:3000/health` e `http://localhost:3000/docs`.

## Docker (produção)

```bash
# Build e start completo (API + PostgreSQL)
docker compose up --build -d

# Ver logs
docker compose logs -f api
```

> **Atenção:** a `DATABASE_URL` em Docker aponta para o serviço `postgres` automaticamente.  
> Em ambiente local (sem Docker), use `localhost`. Veja `.env.example`.
> O container da API executa `prisma migrate deploy` antes de iniciar o servidor.

## Endpoints

| Método | Rota                | Descrição                          |
|--------|---------------------|------------------------------------|
| GET    | `/health`           | Health check                       |
| POST   | `/api/v1/review`    | Executa revisão de código          |
| POST   | `/api/v1/review/stream` | Executa revisão via Server-Sent Events |
| GET    | `/api/v1/history`   | Lista últimas execuções            |
| GET    | `/api/v1/history/:id` | Detalhes de uma execução         |
| GET    | `/docs`             | Swagger UI (OpenAPI)               |

### POST /api/v1/review

```json
{
  "code": "function sum(a, b) { return a + b; }",
  "language": "typescript",
  "context": "Descrição opcional do contexto"
}
```

**Languages suportados:** `typescript`, `javascript`, `python`, `php`

### POST /api/v1/review/stream

Usa o mesmo payload do `/api/v1/review` e responde como `text/event-stream`, emitindo eventos `started`, `step`, `result`, `error` e `done`.

### Webhook opcional

Quando `WEBHOOK_CALLBACK_URL` estiver configurado, cada execucao de review envia um `POST` JSON para a URL ao finalizar com sucesso ou falha. Falhas no callback sao registradas no historico como step `webhook_callback`, mas nao alteram a resposta principal.

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
| `HOST`                       | `0.0.0.0`                                         | ❌          |
| `PORT`                       | `3000`                                            | ❌          |
| `LANGSMITH_TRACING`          | `false`                                           | ❌          |
| `LANGSMITH_API_KEY`          | `lsv2_...`                                        | ❌          |
| `LANGSMITH_PROJECT`          | `cpj-cobranca-api-ai`                             | ❌          |
| `WEBHOOK_CALLBACK_URL`       | `https://example.com/webhook/cpj-cobranca`        | ❌          |

> Variáveis LangSmith são opcionais. Para ativar tracing, defina `LANGSMITH_TRACING=true` e informe `LANGSMITH_API_KEY`.
> OpenRouter foi escolhido por permitir alternar modelos via `OPENROUTER_DEFAULT_MODEL`. A execucao real exige `OPENROUTER_API_KEY`; custos dependem do modelo configurado.
> Quando `WEBHOOK_CALLBACK_URL` estiver configurado, a API envia um `POST` JSON com status, `execution_id`, `cache_hit` e resultado ou erro do review.

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
