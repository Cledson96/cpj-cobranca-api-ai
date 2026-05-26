# API, Contratos e Exemplos


## Objetivo deste capitulo

Este capitulo documenta a superficie HTTP da aplicacao: endpoints, payloads,
respostas, filtros, SSE e exemplos praticos.

O foco e ajudar quem avalia o case a entender:

- quais rotas existem;
- o que cada uma recebe;
- o que cada uma retorna;
- onde entram `model` e `prompt_version`;
- como os endpoints se relacionam com historico, batch e governanca.

## Convencoes gerais da API

### Base path

As rotas de negocio ficam sob `/api/v1`, com excecao de:

- `GET /health`
- `GET /docs`

### Formato de payload

As requests e responses usam JSON, exceto o endpoint de streaming do review,
que responde como `text/event-stream`.

### Validacao

As entradas sao validadas com Zod. Quando o payload nao atende ao schema
esperado, a API responde com erro de validacao em vez de deixar o fluxo seguir
com dados ambiguos.

### Overrides por request

Nos fluxos com IA, dois campos podem aparecer como opcionais:

- `prompt_version`: força uma versao especifica de prompt para aquela execucao;
- `model`: sobrescreve o modelo padrao global, desde que ele esteja cadastrado
  e ativo.

## Mapa geral dos endpoints

| Metodo | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/health` | Healthcheck da API |
| `POST` | `/api/v1/review` | Review de codigo |
| `POST` | `/api/v1/review/stream` | Review via SSE |
| `POST` | `/api/v1/review/pull-request` | Review de Pull Request |
| `POST` | `/api/v1/compliance` | Aderencia entre tarefa e codigo |
| `POST` | `/api/v1/document` | Geracao de documentacao |
| `POST` | `/api/v1/tests` | Geracao de testes |
| `POST` | `/api/v1/tests/pull-request` | Geracao de testes a partir de PR |
| `POST` | `/api/v1/batch` | Execucao de varios fluxos em lote |
| `GET` | `/api/v1/history` | Lista de execucoes |
| `GET` | `/api/v1/history/:id` | Detalhe de uma execucao |
| `GET` | `/api/v1/analytics/usage` | Agregados de uso, tokens e custo |
| `GET` | `/api/v1/prompts` | Lista versoes de prompt |
| `GET` | `/api/v1/prompts/:flowType/active` | Busca prompt ativo do fluxo |
| `GET` | `/api/v1/prompts/:flowType/:version` | Busca versao especifica |
| `POST` | `/api/v1/prompts` | Cria nova versao de prompt |
| `POST` | `/api/v1/prompts/:flowType/:version/activate` | Ativa uma versao |
| `GET` | `/api/v1/models` | Lista modelos cadastrados |
| `GET` | `/api/v1/models/default` | Busca modelo padrao global |
| `POST` | `/api/v1/models` | Cadastra modelo |
| `PATCH` | `/api/v1/models/:id` | Atualiza modelo |
| `DELETE` | `/api/v1/models/:id` | Remove modelo nao padrao |
| `GET` | `/docs` | Swagger UI |

## Endpoints de fluxo

### POST `/api/v1/review`

Faz review estruturado de um trecho de codigo.

#### Request

```json
{
  "code": "function sum(a, b) { return a + b; }",
  "language": "typescript",
  "context": "Trecho usado em um modulo financeiro",
  "prompt_version": 1,
  "model": "openai/gpt-4o-mini"
}
```

#### Response

```json
{
  "overall_quality": "needs_improvement",
  "score": 7,
  "issues": [
    {
      "severity": "medium",
      "line_hint": "linha 1",
      "description": "A funcao nao explicita contrato de tipos de entrada.",
      "suggestion": "Defina tipos ou valide entradas conforme o contrato esperado."
    }
  ],
  "positives": [
    "Funcao pequena e facil de entender."
  ],
  "summary": "O codigo e simples, mas merece um contrato mais claro."
}
```

#### Campos principais

- `language`: `typescript`, `javascript`, `python` ou `php`
- `context`: opcional
- `prompt_version`: opcional
- `model`: opcional

### POST `/api/v1/review/stream`

Executa o mesmo review, mas em SSE.

#### Request

Usa o mesmo payload do endpoint `/api/v1/review`.

#### Eventos SSE

Os eventos emitidos sao:

- `started`
- `step`
- `result`
- `error`
- `done`

#### Exemplo de sequencia

```text
event: started
data: {"execution_id":"uuid","cache_hit":false}

event: step
data: {"node_name":"language_router","kind":"system","status":"success","duration_ms":8}

event: result
data: {"output":{"overall_quality":"good","score":9,"issues":[],"positives":["Codigo simples"],"summary":"Sem problemas relevantes."}}

event: done
data: {}
```

### POST `/api/v1/review/pull-request`

Executa review de Pull Request no GitHub com Jira opcional.

#### Request

```json
{
  "github_pull_request_url": "https://github.com/org/repo/pull/123",
  "jira_issue_key": "CPJ-123",
  "base_branch": "main",
  "prompt_version": 1,
  "model": "openai/gpt-4o-mini"
}
```

#### Response

```json
{
  "verdict": "needs_attention",
  "score": 78,
  "summary": "O PR esta consistente, mas possui alertas relevantes de seguranca e padrao.",
  "pull_request": {
    "owner": "org",
    "repo": "repo",
    "number": 123,
    "title": "Ajusta regras de cobranca",
    "base_branch": "main",
    "head_sha": "abc123",
    "changed_files": 6
  },
  "jira": {
    "issue_key": "CPJ-123",
    "summary": "Ajustar fluxo de renegociacao",
    "criteria_count": 3,
    "evaluated": true
  },
  "sections": {
    "code_standard": {
      "status": "warning",
      "findings": []
    },
    "jira_criteria": {
      "status": "passed",
      "criteria": []
    },
    "project_consistency": {
      "status": "passed",
      "findings": []
    },
    "security": {
      "status": "warning",
      "findings": []
    }
  },
  "positives": [
    "Boa separacao por modulo."
  ],
  "recommendations": [
    "Revisar validacoes de entrada sensivel."
  ]
}
```

### POST `/api/v1/compliance`

Compara tarefa e implementacao.

#### Request

```json
{
  "task_description": "Permitir renegociacao apenas para contratos ativos e registrar auditoria.",
  "code": "if (contract.active) { renegotiate(contract); audit(contract.id); }",
  "language": "typescript",
  "prompt_version": 1,
  "model": "deepseek/deepseek-v4-flash"
}
```

#### Response

```json
{
  "compliant": true,
  "compliance_score": 95,
  "covered_requirements": [
    "Valida contrato ativo antes da renegociacao."
  ],
  "missing_requirements": [],
  "partial_requirements": [],
  "verdict": "Aderente."
}
```

### POST `/api/v1/document`

Gera documentacao tecnica ou operacional.

#### Request

```json
{
  "code": "export function charge(amount: number) { return amount > 0; }",
  "language": "typescript",
  "doc_type": "technical",
  "prompt_version": 1,
  "model": "openai/gpt-4o-mini"
}
```

#### Response

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

### POST `/api/v1/tests`

Gera casos e arquivo de testes.

#### Request

```json
{
  "code": "export function charge(amount: number) { return amount > 0; }",
  "language": "typescript",
  "test_framework": "vitest",
  "prompt_version": 1,
  "model": "deepseek/deepseek-v4-flash"
}
```

#### Response

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
  "coverage_hints": [
    "Adicionar teste para amount <= 0 quando houver regra de erro."
  ]
}
```

### POST `/api/v1/tests/pull-request`

Gera testes com base nas alteracoes de um Pull Request.

#### Request

```json
{
  "github_pull_request_url": "https://github.com/org/repo/pull/123",
  "base_branch": "main",
  "test_framework": "vitest",
  "prompt_version": 1,
  "model": "openai/gpt-4o-mini"
}
```

#### Response

Usa o mesmo schema de resposta do endpoint `/api/v1/tests`.

### POST `/api/v1/batch`

Executa varios itens em sequencia.

#### Request

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

#### Response

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
        "positives": [
          "Codigo simples e legivel."
        ],
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
        "test_file": "import { expect, it } from 'vitest';\n...",
        "test_cases": [],
        "coverage_hints": []
      },
      "error_message": null
    }
  ]
}
```

## Endpoints de historico e analytics

### GET `/api/v1/history`

Lista execucoes recentes.

#### Query params

- `limit`
- `cursor`
- `flow_type`
- `status`
- `model`
- `from`
- `to`
- `cache_hit`

#### Exemplo

```text
GET /api/v1/history?limit=20&flow_type=review&status=success
```

#### Response resumida

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "review",
      "status": "success",
      "timestamp": "2026-05-26T10:30:00-03:00",
      "duration_ms": 1240,
      "cache_hit": false,
      "source_execution_id": null,
      "telemetry": null,
      "steps": [
        {
          "node_name": "language_router",
          "kind": "system",
          "status": "success",
          "duration_ms": 8
        }
      ]
    }
  ],
  "page": {
    "limit": 20,
    "next_cursor": null
  }
}
```

### GET `/api/v1/history/:id`

Retorna o detalhamento completo da execucao, incluindo:

- `input_payload`
- `output_payload`
- `error_message`
- `steps` completos
- `telemetry`

### GET `/api/v1/analytics/usage`

Agrega execucoes e consumo.

#### Query params

- `flow_type`
- `model`
- `from`
- `to`

#### Response resumida

```json
{
  "totals": {
    "executions": 12,
    "successful": 10,
    "failed": 2,
    "cache_hits": 3,
    "prompt_tokens": 14000,
    "completion_tokens": 6200,
    "total_tokens": 20200,
    "cache_read_tokens": 500,
    "cost_total_usd": 0.024,
    "cost_input_usd": 0.009,
    "cost_output_usd": 0.015,
    "average_duration_ms": 980
  },
  "by_day": [],
  "by_flow": [],
  "by_model": []
}
```

## Endpoints de prompts

### GET `/api/v1/prompts`

Lista versoes por fluxo. Requer query `flow_type`.

#### Exemplo

```text
GET /api/v1/prompts?flow_type=review
```

### GET `/api/v1/prompts/:flowType/active`

Busca a versao ativa de um fluxo.

### GET `/api/v1/prompts/:flowType/:version`

Busca uma versao especifica.

### POST `/api/v1/prompts`

Cria nova versao.

#### Exemplo

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

### POST `/api/v1/prompts/:flowType/:version/activate`

Ativa uma versao existente.

## Endpoints de modelos

### GET `/api/v1/models`

Lista modelos cadastrados.

### GET `/api/v1/models/default`

Retorna o modelo padrao global.

### POST `/api/v1/models`

#### Request

```json
{
  "name": "anthropic/claude-3.5-haiku"
}
```

### PATCH `/api/v1/models/:id`

#### Request

```json
{
  "is_default": true
}
```

### DELETE `/api/v1/models/:id`

Remove um modelo nao padrao.

## Healthcheck e Swagger

### GET `/health`

Retorna o status operacional da API.

### GET `/docs`

Abre a documentacao interativa Swagger/OpenAPI.

## Relacao entre endpoints e persistencia

Nem todo endpoint apenas responde e termina. Alguns tambem influenciam o que vai
para o historico e para analytics:

- `review`, `compliance`, `document`, `tests` e `pull-request review` podem
  gerar execucoes persistidas;
- `batch` cria um resumo de lote e pode acionar varios subfluxos persistidos;
- `history` e `analytics` leem a base persistida;
- `prompts` e `models` alteram governanca em runtime.

## Onde validar manualmente

Para teste manual rapido, os melhores pontos de entrada sao:

- `requests/cpj-cobranca-api.http`
- `GET /docs`
- `GET /health`

## Relacao com os proximos capitulos

Depois deste capitulo, o proximo passo natural e `07-dados-cache-telemetria.md`,
que mostra como essas respostas, steps, custos, prompts e modelos ficam
guardados no banco.
