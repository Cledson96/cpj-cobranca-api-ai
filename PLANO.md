# Plano da API CPJ-Cobranca AI

## Resumo

Projeto recriado do zero em `C:\trabalho\case-ts`, usando o case em `.docx`
como fonte dos requisitos e os projetos `C:\projetos\api_processos` e
`C:\projetos\motores_analise_2` como referencias de arquitetura.

Decisoes:

- Repositorio: `Cledson96/cpj-cobranca-api-ai`, publico.
- Escopo: API only, sem front/admin nesta fase.
- Backend: TypeScript, Fastify e orientacao a objetos com classes.
- IA: LangChain JS, LangGraph JS, ChatOpenRouter/OpenRouter e LangSmith.
- Banco: PostgreSQL via Docker Compose, Prisma como ORM.
- Diferenciais v1: batch, cache por hash, SSE, webhook, structured output,
  tools, logs estruturados e historico persistido.
- Git: commits pequenos, em portugues, com prefixos `feat:`, `bug:`, `docs:`,
  `test:`, `chore:` e `refactor:`.

## Arquitetura

A API segue arquitetura modular inspirada no `api_processos`:

- `src/infrastructure`: Prisma, logging, OpenRouter, LangSmith, webhook e erros.
- `src/shared`: config/env, middlewares, schemas comuns e helpers.
- `src/modules/*`: controllers, services, repositories, routes e models.
- `src/modules/agent`: engines, graphs, tools, prompts, output schemas e runner.

O motor de IA segue o estilo do `motores_analise_2`, adaptado para TypeScript:

- `BaseAgentEngine`: classe base por fluxo.
- `AgentEngineRunner`: executa, mede tempo, grava passos e trata erro.
- `BaseFlowGraph`: monta o grafo LangGraph comum.
- `ReviewEngine`, `ComplianceEngine`, `DocumentEngine`, `TestsEngine`: engines
  especializados.
- Tools deterministicas antes do LLM.
- Structured output com Zod e validacao local obrigatoria.
- Uma tentativa de reparo quando o JSON/schema falhar.

Fluxo padrao:

```text
start
-> create_execution
-> cache_lookup
-> run_tools
-> build_prompt
-> call_llm_structured
-> validate_output
-> persist_success
-> webhook_if_enabled
-> end
```

Em caso de cache hit, o grafo pula o LLM e persiste uma nova execucao com
`cache_hit=true`.

## APIs Publicas

Endpoints obrigatorios:

- `GET /health`
- `POST /api/v1/review`
- `POST /api/v1/compliance`
- `POST /api/v1/document`
- `POST /api/v1/tests`
- `GET /api/v1/history`
- `GET /api/v1/history/:id`

Diferenciais:

- `POST /api/v1/batch`
- `POST /api/v1/review/stream`
- `POST /api/v1/document/stream`

Contrato do batch:

```json
{
  "items": [
    { "flow_type": "review", "payload": { "code": "...", "language": "typescript" } }
  ],
  "continue_on_error": true,
  "notify": false
}
```

Resposta do batch:

```json
{
  "batch_id": "uuid",
  "status": "success | partial | failed",
  "results": [
    {
      "index": 0,
      "flow_type": "review",
      "execution_id": "uuid",
      "status": "success",
      "cache_hit": false,
      "output": {}
    }
  ]
}
```

SSE envia eventos `started`, `step`, `result`, `error` e `done`.

## Persistencia

Modelos principais:

- `Execution`: id, createdAt, flowType, status, inputPayload, outputPayload,
  durationMs, requestHash, cacheHit, sourceExecutionId e errorMessage.
- `ExecutionTelemetry`: executionId, provider, modelRequested, modelUsed,
  langsmithRunId, promptTokens, completionTokens, totalTokens e costUsd.
- `ExecutionStep`: executionId, nodeName, kind, status, inputPayload,
  outputPayload, durationMs e errorMessage.
- `PromptVersion`: flowType, version, name, systemPrompt, userPrompt e isActive.
- `BatchExecution`: id, status, itemCount, successCount, failedCount e durationMs.

O cache por hash reutiliza apenas execucoes `success` do mesmo `flowType` e do
mesmo payload normalizado.

## Ordem de Implementacao

1. Planejamento, GitHub e branches.
2. Base Fastify/TypeScript com health.
3. Prisma/PostgreSQL e infraestrutura de logs/config.
4. Contratos Zod dos quatro fluxos, batch, history, SSE e erros.
5. Motor de IA OO com LangGraph, LangChain, OpenRouter e LangSmith.
6. Endpoints obrigatorios e historico.
7. Cache, batch, SSE e webhook.
8. Docker, exemplos HTTP e README.
9. Verificacao final, correcoes e push das branches.

## Testes

Automatizados:

- Health retorna 200.
- Schemas rejeitam payload invalido.
- Cada endpoint obrigatorio retorna JSON no contrato esperado.
- Agent runner persiste sucesso, falha e cache hit.
- Cache evita nova chamada ao LLM.
- Batch continua apos erro quando `continue_on_error=true`.
- SSE emite `started`, `step`, `result`, `done`.
- Webhook envia payload correto quando habilitado.
- OpenRouter fica mockado nos testes.

Manuais:

- `cp .env.example .env`
- `docker compose up --build`
- `curl http://localhost:3000/health`
- Executar todos os exemplos de `requests/cpj-cobranca-api.http`.

## Assumptions

- O `.docx` do case nao sera commitado.
- OpenRouter exige `OPENROUTER_API_KEY`; sem chave, endpoints de IA retornam erro
  claro de configuracao.
- LangSmith e opcional; com `LANGSMITH_TRACING=true` e chave configurada, traces
  sao enviados.
- Webhook usa URL configurada por ambiente, nao URL arbitraria por request.
- O front/admin fica fora desta etapa.
