# Testes e Validacao

## Objetivo deste capitulo

Este capitulo mostra como validar tecnicamente a entrega: testes automatizados,
comandos de qualidade e validacoes manuais mais relevantes.

## Filosofia de validacao do case

Como este projeto foi construido para um case tecnico, a validacao precisa
provar tres coisas:

- a API sobe;
- os fluxos principais respondem corretamente;
- a base tecnica e consistente o suficiente para evolucao.

Por isso, a estrategia combina:

- testes automatizados;
- verificacoes de build e lint;
- validacao manual de endpoints e painel.

## Suite automatizada do backend

O backend usa Vitest como runner principal.

### Cobertura funcional esperada

A suite cobre, entre outros pontos:

- rotas principais;
- contracts Zod;
- historico;
- analytics;
- prompts;
- modelos;
- review;
- compliance;
- document;
- tests;
- batch;
- PR review;
- PR tests;
- retry;
- docker e workflow em pontos criticos.

## Suite automatizada da web

O frontend em `apps/web` tambem possui testes com Vitest e Testing Library.

Esses testes validam paginas como:

- dashboard;
- history;
- prompts;
- models;
- execute;
- status;
- cliente HTTP compartilhado.

## Comandos principais de validacao

### Backend

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

### Frontend

```bash
npm run build:web
npm run test:web
```

## O que cada comando prova

### `npm test`

Prova que a suite principal do backend segue verde.

### `npm run typecheck`

Prova que o TypeScript compila semanticamente sem erros.

### `npm run lint`

Prova consistencia estatica e higiene de codigo nas pastas alvo.

### `npm run build`

Prova que a API empacota corretamente para producao.

### `npm run build:web`

Prova que o painel compila e gera build de producao.

### `npm run test:web`

Prova que a camada de interface principal continua funcional.

## Validacao manual recomendada

Mesmo com testes automatizados, o case ganha muito quando passa por uma rodada
manual simples.

### Passo 1

Validar:

```text
GET /health
```

### Passo 2

Abrir:

```text
GET /docs
```

### Passo 3

Executar pelo menos uma request de cada fluxo principal:

- `review`
- `compliance`
- `document`
- `tests`

### Passo 4

Executar:

- `batch`
- `review/pull-request`
- `tests/pull-request`

quando as credenciais externas estiverem disponiveis.

### Passo 5

Conferir:

- `GET /api/v1/history`
- `GET /api/v1/analytics/usage`

### Passo 6

Abrir o painel e validar:

- dashboard;
- history;
- prompts;
- models;
- execute;
- status.

## Validacao via arquivo `.http`

O arquivo:

```text
requests/cpj-cobranca-api.http
```

e a referencia mais pratica para demonstracao manual dos endpoints.

Ele concentra exemplos prontos para uso durante:

- desenvolvimento;
- depuracao;
- demonstracao;
- avaliacao do case.

## Criterios de aceite tecnicos

Uma leitura objetiva dos criterios de aceite para a entrega atual seria:

1. a API sobe localmente;
2. o banco conecta e persiste execucoes;
3. os quatro fluxos obrigatorios funcionam;
4. o historico pode ser consultado;
5. a documentacao OpenAPI esta disponivel;
6. o projeto roda em Docker;
7. o painel web consegue consumir a API;
8. os diferenciais mais importantes estao operacionais.

## O que esta sendo efetivamente provado

Ao combinar testes, build e validacao manual, a entrega demonstra:

- corretude contratual;
- funcionamento dos endpoints;
- integridade da base de codigo;
- consistencia de build;
- prontidao para avaliacao tecnica.

## Testes versus integracoes externas

Nem tudo precisa depender de chamadas reais a OpenRouter, GitHub ou Jira para
ser validado com confianca.

A estrategia do projeto privilegia:

- testes de contratos e rotas;
- isolamento de dependencias;
- validacao estrutural da aplicacao;
- demonstracao manual quando integracoes reais estiverem disponiveis.

Isso e adequado ao contexto de case, onde a clareza do desenho conta tanto
quanto a presenca de todos os ambientes externos.

## Riscos residuais

Mesmo com a suite atual, alguns riscos continuam existindo:

- variacao de qualidade do LLM em execucao real;
- instabilidade de credenciais externas;
- comportamento de custo/token dependente do provedor;
- falhas de rede em PR review, PR tests ou webhook.

Esses pontos, no entanto, ficam bem delimitados e visiveis pela arquitetura e
pela telemetria do projeto.

## Relacao com os proximos capitulos

Depois deste capitulo, os capitulos mais uteis para aprofundar a manutencao do
projeto sao:

- `13-extensibilidade.md`
- `14-troubleshooting-faq.md`
