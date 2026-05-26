# Troubleshooting e FAQ

## Objetivo deste capitulo

Este capitulo reune problemas comuns, sintomas provaveis e caminhos de
diagnostico para API, banco, painel, integracoes externas e deploy.

## A API nao sobe

### Sintomas comuns

- erro logo no boot;
- `GET /health` indisponivel;
- container `api` reiniciando.

### Verificacoes recomendadas

1. conferir `DATABASE_URL`;
2. conferir `OPENROUTER_API_KEY`;
3. validar se o banco esta acessivel;
4. revisar logs da API;
5. validar se migrations e seed foram aplicados.

## Erro de banco de dados

### Causas comuns

- host incorreto na `DATABASE_URL`;
- banco ainda nao pronto;
- porta errada;
- migrations nao aplicadas.

### Acoes uteis

```bash
docker compose logs -f postgres
npx prisma migrate dev
npm run prisma:deploy
```

## `GET /health` responde, mas fluxos falham

Isso normalmente indica que a API subiu, mas alguma integracao essencial nao
esta funcional.

### Verificar

- `OPENROUTER_API_KEY`
- modelo padrao global
- modelo solicitado na request
- conectividade externa
- retry e mensagens de erro no historico

## Falha com OpenRouter

### Causas provaveis

- chave invalida;
- limite do provider;
- modelo nao disponivel;
- telemetria externa indisponivel.

### Observacoes

- o fluxo de retry pode repetir chamadas transitorias;
- telemetria adicional nao impede necessariamente a resposta principal;
- o historico pode mostrar falha em step LLM com detalhes uteis.

## O modelo informado na request nao funciona

### Causas provaveis

- modelo nao cadastrado;
- modelo cadastrado, mas inativo;
- typo no nome enviado.

### O que validar

- `GET /api/v1/models`
- modelo padrao em `GET /api/v1/models/default`
- payload enviado no endpoint

## Prompt nao muda mesmo depois de cadastrar nova versao

### Causas comuns

- nova versao criada, mas nao ativada;
- request usando `prompt_version` antigo explicitamente;
- fluxo com fallback local em ambiente sem repositorio persistido ativo.

### Verificar

- `GET /api/v1/prompts/:flowType/active`
- `POST /api/v1/prompts/:flowType/:version/activate`
- payload efetivo da chamada

## PR review ou PR tests falham

### Causas provaveis

- `GITHUB_TOKEN` ausente ou insuficiente;
- URL do PR invalida;
- repositorio privado sem permissao;
- `JIRA_*` ausentes quando Jira e exigido;
- indisponibilidade de GitHub ou Jira.

### Verificacoes uteis

- confirmar formato da URL do PR;
- revisar se `base_branch` faz sentido;
- validar se `jira_issue_key` e realmente necessario;
- checar logs e steps como `github_fetch` e `jira_fetch`.

## Webhook falha

### Comportamento esperado

Falha no callback de webhook nao derruba a resposta principal do fluxo.

### Onde aparece

- em `ExecutionStep`, como `webhook_callback` com status `failed`;
- em logs da API;
- potencialmente no historico detalhado.

### O que revisar

- `WEBHOOK_CALLBACK_URL`
- disponibilidade do endpoint externo;
- autenticacao exigida no destino;
- latencia e timeout.

## Painel web nao carrega dados

### Causas comuns

- `NEXT_PUBLIC_API_BASE_URL` incorreta;
- API fora do ar;
- CORS ou rota errada;
- frontend apontando para ambiente errado.

### Verificar

- abrir a tela `Status/API Docs`;
- conferir o valor de `API Base`;
- testar `GET /health` diretamente na URL configurada.

## Swagger nao abre

### Possiveis causas

- API ainda nao subiu por completo;
- erro de rota reversa via Nginx;
- problema de proxy em producao.

### Validacao

- testar localmente `GET /docs`;
- em producao, validar healthcheck local da API;
- revisar configuracoes de Nginx.

## Analytics vazio

### Causas comuns

- nenhuma execucao persistida ainda;
- fluxo rodou, mas falhou antes de gerar telemetria;
- filtros muito restritivos.

### O que fazer

- executar um fluxo simples;
- consultar `GET /api/v1/history`;
- remover filtros de `flow_type`, `model`, `from` e `to`.

## Historico sem detalhes esperados

### Possiveis causas

- cache hit com pouca execucao nova;
- integracao sem telemetria retornada pelo provider;
- falha antes da gravacao de determinados steps.

### Validacao

- abrir `GET /api/v1/history/:id`;
- comparar execucao original e execucao cache hit;
- conferir steps gravados.

## Docker sobe, mas a web nao abre

### Verificar

- `WEB_PORT_MAP`
- logs do container `web`
- build do Next.js
- disponibilidade da API de backend

## Deploy na VPS nao conclui

### Verificacoes uteis

1. revisar o workflow do GitHub Actions;
2. validar secrets de SSH;
3. revisar `scripts/deploy.sh`;
4. revisar logs dos containers;
5. validar `nginx -t` no host;
6. testar healthchecks locais `127.0.0.1:3020` e `127.0.0.1:3021`.

## Retry parece aumentar muito a latencia

### Causa provavel

Valores altos de tentativas e delay base podem elevar o tempo total de espera em
falhas externas.

### O que revisar

- `EXTERNAL_RETRY_ATTEMPTS`
- `EXTERNAL_RETRY_BASE_DELAY_MS`

## FAQ rapido

### Preciso de GitHub e Jira para todos os fluxos?

Nao. Eles sao relevantes principalmente para `review/pull-request` e
`tests/pull-request`.

### Posso rodar sem LangSmith?

Sim. O tracing e opcional.

### Posso rodar sem webhook?

Sim. O callback e opcional.

### Posso rodar sem painel?

Sim. A API funciona independentemente da interface web.

### O case depende de Ollama?

Nao. O provedor padrao atual e OpenRouter.

## Relacao com o proximo capitulo

Depois deste capitulo, o `15-glossario.md` ajuda a consolidar os principais
termos tecnicos usados ao longo da documentacao.
