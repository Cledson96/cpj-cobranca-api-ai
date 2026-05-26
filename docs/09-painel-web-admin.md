# Painel Web Admin


## Objetivo deste capitulo

Este capitulo descreve o painel web localizado em `apps/web`, que funciona como
uma camada visual de operacao sobre a API.

O painel nao substitui a API nem concentra a logica principal dos fluxos. Ele
atua como console tecnico para:

- visualizar metricas;
- consultar historico;
- administrar prompts e modelos;
- executar fluxos de forma guiada;
- validar status da API e acesso ao Swagger.

## Papel do painel no contexto do case

O case nao exigia um frontend administrativo, mas essa interface ajuda muito em
avaliacao e demonstracao.

Ela torna mais facil:

- explorar os recursos sem depender apenas de JSON bruto;
- inspecionar dados persistidos;
- provar que analytics, historico, prompts e modelos realmente funcionam;
- operar fluxos principais com menos atrito.

## Stack do painel

O painel foi construido com:

- Next.js 16
- React 19
- Ant Design 6
- Ant Design Charts

Essa escolha segue a ideia de uma interface operacional, densa e objetiva, em
vez de uma camada visual decorativa ou de marketing.

## Integracao com a API

Toda a informacao do painel vem da API. Ele usa `NEXT_PUBLIC_API_BASE_URL` para
definir o endpoint base em runtime.

Isso preserva uma separacao clara:

- a API continua sendo a fonte de verdade;
- o painel e apenas cliente da API.

## Navegacao principal

O shell principal expoe as seguintes rotas:

- `/` - Dashboard
- `/history` - Historico
- `/prompts` - Prompts
- `/models` - Modelos
- `/execute` - Executar fluxos
- `/status` - Status/API Docs

## Dashboard

O dashboard e a visao inicial do painel. Ele se apoia em
`GET /api/v1/analytics/usage`.

### Informacoes exibidas

- total de execucoes;
- custo total;
- taxa de cache hit;
- taxa de sucesso e falha;
- tempo medio;
- ranking por fluxo;
- ranking por modelo;
- pulso diario de tokens.

### Objetivo operacional

O dashboard transforma a telemetria persistida em uma leitura rapida da saude
do sistema. E a tela mais util para perceber padroes de uso e custo sem abrir
execucoes individuais.

## Historico

A tela de historico consome:

- `GET /api/v1/history`
- `GET /api/v1/history/:id`

### Recursos principais

- filtro por fluxo;
- filtro por status;
- paginacao via cursor;
- abertura de drawer com detalhe da execucao;
- exibicao de telemetria;
- timeline de steps;
- visualizacao de payloads de entrada e saida.

### Valor tecnico

Essa pagina mostra com clareza que a persistencia nao e apenas conceitual. O
avaliador consegue ver:

- execucoes reais;
- steps reais;
- custos e tokens;
- payloads associados.

## Prompts

A tela de prompts opera a camada de governanca de comportamento.

### Recursos principais

- escolha do fluxo;
- carregamento da versao ativa;
- visualizacao de versoes existentes;
- criacao de nova versao com blocos por fluxo;
- ativacao de versao.

### Diferenca por fluxo

A interface se adapta ao tipo de fluxo:

- fluxos simples usam apenas `agent`;
- `review` expoe todos os blocos especialistas e aggregator;
- `pull_request_review` expoe os blocos especificos desse fluxo.

## Modelos

A tela de modelos opera o catalogo permitido da API.

### Recursos principais

- cadastro de novo modelo;
- listagem de modelos;
- ativacao/desativacao;
- definicao de modelo padrao;
- exclusao de modelo nao padrao.

### Valor para o case

Essa tela ajuda a demonstrar que a escolha do modelo nao esta enterrada em env
ou no codigo do runner. Existe de fato uma camada administrativa por cima.

## Executar fluxos

A tela `Executar fluxos` e uma camada guiada para testes manuais.

### Abas disponiveis

- Review
- Compliance
- Document
- Tests
- PR Review
- PR Tests
- Batch

### Objetivo

Essa pagina permite executar os fluxos mais importantes sem montar requests
manualmente fora da aplicacao.

Ela e especialmente util para:

- demonstracao do case;
- validacao manual rapida;
- exploracao dos contratos por quem ainda nao viu o `.http`.

## Status/API Docs

A tela de status tem foco em conectividade e operacao.

### Recursos

- consulta ao `GET /health`;
- exibicao do estado operacional;
- link para Swagger;
- link para o JSON OpenAPI.

Essa pagina funciona como ponto rapido para confirmar se a API esta disponivel e
para abrir a documentacao interativa.

## Cliente HTTP compartilhado

O painel centraliza chamadas HTTP em uma camada de cliente comum.

Isso ajuda a:

- manter endpoints concentrados em um lugar;
- padronizar serializacao de query string;
- manter tipos alinhados entre frontend e API.

## Experiencia esperada do avaliador

Com o painel ativo, um avaliador tecnico consegue:

1. abrir o dashboard e ver o resumo operacional;
2. consultar historico e detalhes de execucao;
3. alterar prompts ou modelos;
4. disparar fluxos manualmente;
5. abrir Swagger e cruzar contratos.

Isso melhora bastante a experiencia de entendimento do projeto.

## Limites assumidos no painel atual

O painel foi desenhado como console tecnico e assume alguns limites:

- nao ha autenticacao;
- nao ha controle de permissao por perfil;
- nao existe editor rico de prompt;
- o dashboard usa leitura agregada simples, nao drill-down analitico profundo;
- o execute page nao expoe todos os campos possiveis de todos os endpoints.

Esses limites sao coerentes com o escopo do case e nao diminuem o valor
operacional da interface entregue.

## Relacao com os proximos capitulos

Depois deste capitulo, o passo natural e `10-como-rodar.md`, para subir API,
banco e painel juntos em ambiente local.
