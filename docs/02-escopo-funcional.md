# Escopo Funcional

> Status: em revisao

## Objetivo deste capitulo

Este capitulo descreve o que a solucao entrega do ponto de vista funcional.
Aqui o foco nao e explicar a arquitetura interna, mas deixar claro quais fluxos
existem, para que servem, como se relacionam com o case tecnico e quais recursos
de apoio foram implementados ao redor deles.

## Visao geral do escopo

O CPJ-Cobranca AI foi construido como uma plataforma de apoio ao processo de
desenvolvimento. A entrega principal e uma API REST com agentes de IA capazes
de analisar artefatos tecnicos e retornar respostas estruturadas, rastreaveis e
persistidas.

O escopo funcional esta organizado em quatro grupos:

- **Fluxos obrigatorios do case**: review, compliance, document e tests.
- **Diferenciais de automacao**: batch, streaming SSE, webhooks, review de Pull
  Request e geracao de testes por Pull Request.
- **Governanca e rastreabilidade**: historico, analytics, prompts versionados,
  catalogo de modelos, cache, telemetria e persistencia.
- **Experiencia operacional**: Swagger/OpenAPI, arquivo `.http`, Docker Compose
  e painel web admin.

## Fluxos obrigatorios do case

### Code Review Automatizado

Endpoint principal:

- `POST /api/v1/review`

Este fluxo recebe um trecho de codigo, a linguagem e um contexto opcional. A
resposta apresenta uma avaliacao estruturada com qualidade geral, nota,
problemas encontrados, sugestoes, pontos positivos e resumo.

No case, esse fluxo deveria verificar pontos como clareza de nomenclatura,
tratamento de erros, vazamentos de recurso, complexidade percebida e padroes
comuns de seguranca. A implementacao amplia esse escopo com:

- suporte a TypeScript, JavaScript, Python e PHP;
- roteamento por linguagem;
- tools deterministicas antes das chamadas ao LLM;
- agentes especialistas para diferentes criterios de revisao;
- agregacao final da analise;
- persistencia de execucao, steps e telemetria;
- cache por hash para evitar reprocessar entradas identicas.

### Avaliacao de Aderencia a Tarefa

Endpoint principal:

- `POST /api/v1/compliance`

Este fluxo recebe uma descricao de tarefa, o codigo implementado e a linguagem.
A resposta informa se a implementacao esta aderente, calcula um score de
conformidade e separa requisitos cobertos, ausentes e parcialmente atendidos.

O objetivo funcional e cruzar o que a tarefa pedia com o que o codigo realmente
faz. Isso ajuda a identificar lacunas de implementacao, comportamentos
parciais, requisitos ignorados e pontos que exigem revisao humana.

### Geracao de Documentacao Tecnica ou Operacional

Endpoint principal:

- `POST /api/v1/document`

Este fluxo recebe codigo, linguagem e tipo de documentacao. O tipo pode orientar
uma documentacao mais tecnica, voltada a desenvolvedores, ou mais operacional,
voltada a squads, produto ou pessoas que precisam entender o comportamento sem
entrar nos detalhes internos do codigo.

A resposta estrutura titulo, descricao, entradas, saidas, efeitos colaterais,
exemplo de uso e observacoes. O foco e transformar codigo em documentacao
util, revisavel e reaproveitavel.

### Geracao de Testes Unitarios

Endpoint principal:

- `POST /api/v1/tests`

Este fluxo recebe codigo, linguagem e framework de teste desejado. A resposta
retorna o framework, um arquivo de teste completo, uma lista de casos cobertos e
dicas de cobertura para revisao manual.

O objetivo e acelerar a criacao de testes para caminhos felizes, casos de borda
e situacoes de erro, sem substituir a revisao tecnica de quem conhece o dominio
do modulo.

## Diferenciais implementados

### Streaming do review

Endpoint:

- `POST /api/v1/review/stream`

Este endpoint executa o mesmo fluxo de review, mas responde via Server-Sent
Events. Ele permite acompanhar eventos como inicio, steps intermediarios,
resultado, erro e finalizacao.

Esse recurso foi implementado como diferencial de experiencia de uso para
processamentos que podem demorar mais do que uma request simples.

### Execucao em lote

Endpoint:

- `POST /api/v1/batch`

O batch permite enviar varios itens em uma unica requisicao e executar fluxos
como `review`, `compliance`, `document` e `tests` em sequencia.

Funcionalmente, ele ajuda em cenarios de avaliacao ou automacao nos quais varios
artefatos precisam ser processados juntos. A resposta consolida o status do
lote e o resultado individual de cada item.

### Review de Pull Request

Endpoint:

- `POST /api/v1/review/pull-request`

Este fluxo amplia o review de codigo para o contexto real de Pull Requests no
GitHub. Ele recebe a URL do Pull Request, pode considerar uma chave Jira
opcional e analisa o diff com base em criterios como padroes de codigo,
seguranca, consistencia com o projeto e aderencia aos criterios da tarefa.

Esse recurso nao era obrigatorio no enunciado original, mas aproxima a solucao
do uso cotidiano de um time tecnico.

### Geracao de testes por Pull Request

Endpoint:

- `POST /api/v1/tests/pull-request`

Este fluxo busca o Pull Request no GitHub, infere a linguagem principal pelos
arquivos alterados, identifica funcoes, branches e casos de erro criticos no
diff e gera testes unitarios focados nas alteracoes.

Ele complementa o fluxo `tests`, que trabalha com codigo enviado diretamente na
request.

### Webhook callback

Quando `WEBHOOK_CALLBACK_URL` esta configurado, os fluxos principais podem
notificar uma URL externa ao concluir com sucesso ou falha.

O webhook nao substitui a resposta HTTP principal. Ele funciona como mecanismo
de integracao para processamentos longos ou automacoes externas, registrando o
step do callback no historico.

### Retry configuravel com backoff

As chamadas externas possuem retry configuravel com backoff exponencial. Isso
cobre chamadas ao LLM via OpenRouter, consultas de telemetria/precos no
OpenRouter, chamadas ao GitHub, consultas ao Jira e callbacks de webhook.

As variaveis `EXTERNAL_RETRY_ATTEMPTS` e `EXTERNAL_RETRY_BASE_DELAY_MS`
controlam a quantidade de tentativas e o intervalo base entre elas.

## Rastreabilidade e governanca

### Historico de execucoes

Endpoints:

- `GET /api/v1/history`
- `GET /api/v1/history/:id`

O historico registra as execucoes dos fluxos, incluindo tipo, status, payloads,
resultado, duracao, cache hit, steps intermediarios e telemetria quando
disponivel.

Isso permite auditar como uma resposta foi produzida e facilita depuracao,
demonstracao e avaliacao tecnica.

### Analytics de uso

Endpoint:

- `GET /api/v1/analytics/usage`

O modulo de analytics agrega informacoes operacionais como uso, tokens e custos.
Ele existe para transformar a telemetria persistida em uma visao mais facil de
acompanhar no painel ou em consultas administrativas.

### Prompts versionados

Endpoints:

- `GET /api/v1/prompts`
- `GET /api/v1/prompts/:flowType/active`
- `GET /api/v1/prompts/:flowType/:version`
- `POST /api/v1/prompts`
- `POST /api/v1/prompts/:flowType/:version/activate`

Os prompts podem ser cadastrados, consultados e ativados por fluxo. Isso evita
que toda evolucao de comportamento do agente dependa de alterar codigo e
republicar a aplicacao.

Tambem e possivel informar `prompt_version` em requests especificas para usar
uma versao diferente da ativa.

### Catalogo de modelos

Endpoints:

- `GET /api/v1/models`
- `GET /api/v1/models/default`
- `POST /api/v1/models`
- `PATCH /api/v1/models/:id`
- `DELETE /api/v1/models/:id`

O catalogo de modelos controla quais modelos podem ser usados pela API, qual
modelo esta ativo e qual e o padrao global. Requests individuais podem informar
`model` para sobrescrever o padrao, desde que o modelo esteja cadastrado e
ativo.

### Cache por hash

Os fluxos principais usam hash do payload para reutilizar resultados de
execucoes bem-sucedidas quando a entrada e identica. Isso reduz custo, latencia
e chamadas repetidas ao provedor LLM.

Mesmo em cache hit, uma nova execucao pode ser registrada apontando para a
execucao original, preservando rastreabilidade.

## Experiencia operacional

### Healthcheck

Endpoint:

- `GET /health`

O healthcheck permite validar rapidamente se a API subiu. Ele e usado tanto no
setup local quanto na validacao via Docker.

### OpenAPI e Swagger UI

Endpoint:

- `GET /docs`

A API publica documentacao interativa para facilitar exploracao dos endpoints,
contratos e respostas esperadas.

### Exemplos manuais

O arquivo `requests/cpj-cobranca-api.http` concentra exemplos funcionais para
uso manual durante desenvolvimento, avaliacao e demonstracao.

### Painel web admin

O painel em `apps/web` oferece uma camada visual sobre a API. Ele foi pensado
como console tecnico para:

- visualizar dashboard e metricas;
- consultar historico;
- gerenciar prompts;
- gerenciar modelos;
- executar fluxos guiados;
- verificar status da API e acesso ao Swagger.

O painel nao substitui a API. Ele melhora a experiencia de avaliacao e operacao
dos recursos implementados.

## Fora de escopo nesta versao

Alguns pontos ficam fora do escopo funcional atual:

- autenticacao e autorizacao de usuarios finais;
- controle multi-tenant;
- fila assincrona com worker dedicado;
- streaming SSE para todos os fluxos, ja que nesta versao ele foi implementado
  apenas no fluxo de review;
- edicao visual avancada de prompts;
- avaliacao automatica de qualidade das respostas geradas pelo LLM;
- suporte local via Ollama como provedor padrao.

Esses pontos podem ser evoluidos depois, mas nao impedem a avaliacao do case,
porque os requisitos obrigatorios e varios diferenciais ja estao cobertos pela
entrega atual.

## Relacao com os proximos capitulos

Este capitulo explica o que a solucao faz. Os proximos documentos detalham como
ela foi construida:

- `03-stack-e-decisoes.md`: tecnologias e justificativas.
- `04-arquitetura.md`: organizacao interna e fluxo tecnico.
- `05-fluxos-de-ia-e-agentes.md`: engines, graphs, agents e tools.
- `06-api-contratos-e-exemplos.md`: contratos HTTP e exemplos completos.
