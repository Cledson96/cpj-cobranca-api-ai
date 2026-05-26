# Prompts, Modelos e Governanca


## Objetivo deste capitulo

Este capitulo explica como a aplicacao governa o comportamento dos fluxos de IA
 sem depender exclusivamente de codigo-fonte hardcoded.

O foco esta em dois pilares:

- versionamento e ativacao de prompts;
- catalogo e resolucao de modelos em runtime.

## Visao geral da governanca

A governanca do projeto foi desenhada para separar duas perguntas:

- **como o agente deve se comportar?**
- **qual modelo deve executar esse comportamento?**

Para responder essas perguntas, a aplicacao usa:

- `PromptVersion`, para armazenar blocos de prompt por fluxo;
- `RegisteredModel`, para catalogar modelos aceitos;
- `GlobalModelSettings`, para definir o modelo padrao global;
- `prompt_version` e `model`, para overrides por request.

## Por que essa camada existe

Sem uma camada de governanca, qualquer ajuste de comportamento exigiria:

- editar arquivo de prompt local;
- rebuild da aplicacao;
- novo deploy.

Com a estrutura atual, a API consegue:

- cadastrar novas versoes de prompt;
- ativar uma versao por fluxo;
- trocar o modelo padrao global;
- sobrescrever prompt e modelo em chamadas individuais.

Isso aproxima a entrega de uma operacao real e melhora bastante a avaliacao do
case, porque mostra controle fino sobre a camada de IA.

## Versionamento de prompts

### Estrutura conceitual

Prompts nao sao tratados como um documento unico por fluxo. Eles sao divididos
em blocos menores, o que deixa o comportamento mais modular.

Cada registro de prompt tem:

- `flowType`
- `version`
- `name`
- `blockKey`
- `systemPrompt`
- `isActive`

### Blocos por fluxo

#### Review

O fluxo `review` exige os blocos:

- `naming_clarity`
- `error_handling`
- `resource_leak`
- `complexity`
- `security`
- `aggregator`

#### Compliance, document e tests

Esses fluxos exigem apenas:

- `agent`

#### Pull request review

O fluxo `pull_request_review` exige:

- `code_standard`
- `jira_criteria`
- `project_consistency`
- `security`
- `aggregator`

## Ativacao de versoes

Para cada fluxo, a aplicacao usa uma versao ativa por padrao. Essa ativacao e
controlada pelo endpoint:

```text
POST /api/v1/prompts/:flowType/:version/activate
```

Quando uma nova versao vira ativa:

- requests futuras passam a usar esse conjunto;
- nao e necessario rebuild;
- o comportamento do fluxo muda de forma rastreavel.

## Override por request

Mesmo com uma versao ativa global por fluxo, a API aceita `prompt_version` em
requests individuais.

Isso permite:

- comparar duas versoes sem trocar o padrao global;
- testar comportamento novo em ambiente controlado;
- validar ajustes antes de promover uma versao.

## Resolver de prompts em runtime

A resolucao de prompts e feita pela camada `PromptRuntimeResolver`.

Ela e responsavel por:

- carregar a versao ativa quando `prompt_version` nao e informado;
- carregar a versao especifica quando houver override;
- validar se todos os blocos obrigatorios daquele fluxo existem;
- montar um runtime prompt set compativel com o fluxo.

## Fallback legado

O projeto ainda possui um fallback local por meio de `LegacyPromptRuntimeResolver`.

Isso significa que, na ausencia de repositorio persistido configurado, o sistema
consegue continuar operando com catalogos locais de prompt.

Esse comportamento foi uma escolha pragmatica para:

- manter testes simples;
- nao bloquear ambientes sem banco configurado;
- preservar backward compatibility durante a evolucao da base.

## Seed inicial de prompts

O `prisma/seed.ts` cria o conjunto inicial de prompts quando a tabela ainda nao
possui dados.

O seed inclui:

- `Review v1`
- `Compliance v1`
- `Document v1`
- `Tests v1`
- `Pull Request Review v1`

Isso garante que o projeto sobe com um conjunto funcional de comportamento sem
exigir cadastro manual logo no primeiro boot.

## Catalogo de modelos

### Tabela `RegisteredModel`

O catalogo de modelos define quais nomes podem ser usados pela API.

Cada modelo possui:

- `id`
- `name`
- `isActive`

Isso evita que qualquer request informe nomes arbitrarios ou inconsistentes.

### Tabela `GlobalModelSettings`

Essa tabela guarda o modelo padrao global da aplicacao.

Com isso, a escolha do modelo default deixa de ser apenas uma env var e passa a
ser parte da governanca persistida do sistema.

## Modelo padrao global

Quando um endpoint nao recebe o campo `model`, a aplicacao tenta usar:

1. o modelo padrao global persistido;
2. o fallback operacional definido por `OPENROUTER_DEFAULT_MODEL`, quando
   necessario.

Esse desenho equilibra dois objetivos:

- governanca persistida e editavel por API;
- resiliencia em ambientes onde a tabela ainda nao esteja pronta.

## Seed inicial de modelos

O seed inicial cadastra:

- `openai/gpt-4o-mini`
- `deepseek/deepseek-v4-flash`

E define como padrao inicial:

- `openai/gpt-4o-mini`

## Override de modelo por request

Assim como acontece com prompts, requests individuais podem informar `model`.

Esse override so funciona se:

- o modelo estiver cadastrado;
- o modelo estiver ativo.

Com isso, a API permite experimentacao controlada sem abrir mao de governanca.

## Endpoints de governanca

### Prompts

- `GET /api/v1/prompts`
- `GET /api/v1/prompts/:flowType/active`
- `GET /api/v1/prompts/:flowType/:version`
- `POST /api/v1/prompts`
- `POST /api/v1/prompts/:flowType/:version/activate`

### Modelos

- `GET /api/v1/models`
- `GET /api/v1/models/default`
- `POST /api/v1/models`
- `PATCH /api/v1/models/:id`
- `DELETE /api/v1/models/:id`

## Relacao com os fluxos

Essa camada nao e isolada do restante da aplicacao. Ela participa diretamente
da execucao dos fluxos:

- services resolvem modelo em runtime;
- engines resolvem prompt set antes de invocar o grafo;
- PR review e review tradicional usam blocos diferentes;
- o painel web usa esses endpoints para operacao administrativa.

## Beneficios tecnicos da governanca atual

Os principais ganhos desse desenho sao:

- menor acoplamento entre comportamento de IA e deploy;
- possibilidade de experimentacao controlada;
- rastreabilidade de mudancas de prompt;
- controle sobre quais modelos podem ser usados;
- base clara para auditoria e administracao.

## Limites assumidos

O modelo atual ainda tem alguns limites conscientes:

- nao existe historico de quem ativou uma versao;
- nao ha aprovacao em duas etapas para mudanca de prompt ou modelo;
- prompts nao possuem ambiente separado por tenant ou workspace;
- nao existe avaliacao automatica de performance de prompt por versao.

Mesmo assim, para o escopo do case, a governanca entregue ja mostra maturidade
acima do minimo exigido.

## Relacao com os proximos capitulos

Depois deste capitulo, a leitura natural e:

- `09-painel-web-admin.md`, para ver essa governanca operada via interface;
- `10-como-rodar.md`, para subir tudo localmente;
- `13-extensibilidade.md`, para entender como adicionar novos blocos, fluxos e
  modelos.
