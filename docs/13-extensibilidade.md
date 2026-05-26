# Extensibilidade

## Objetivo deste capitulo

Este capitulo explica como evoluir a solucao sem quebrar o desenho atual. O
foco e mostrar como adicionar novos fluxos, linguagens, agentes, tools, prompts
e modelos com o menor atrito possivel.

## Principio de extensibilidade da base

O projeto foi estruturado para crescer por composicao de modulos, e nao por
acumulo de logica em um unico ponto central.

Na pratica, isso significa que evolucoes costumam seguir um padrao claro:

- criar contrato;
- criar modulo ou expandir modulo existente;
- registrar rota;
- plugar persistencia quando necessario;
- incluir prompt e governanca;
- adicionar testes.

## Como adicionar um novo fluxo

O caminho natural para um novo fluxo seria:

1. criar schema Zod em `src/shared/contracts`;
2. criar modulo em `src/modules/<novo-fluxo>`;
3. adicionar `routes`, `controllers`, `services`, `engines` e `graphs` conforme
   a complexidade;
4. registrar a rota em `src/app.ts`;
5. decidir se o fluxo deve persistir execucao;
6. criar documentacao OpenAPI;
7. adicionar exemplos no `.http`;
8. adicionar testes.

## Como adicionar uma nova linguagem ao review

O fluxo `review` foi desenhado para suportar evolucao por linguagem.

Para incluir uma nova linguagem, o caminho geral seria:

1. atualizar o schema de linguagens suportadas;
2. criar um novo `language profile`;
3. criar um novo grafo especifico da linguagem;
4. atualizar o `LanguageRouter`;
5. registrar o novo grafo no `ReviewFlowGraph`;
6. cobrir com testes.

Esse desenho evita condicoes gigantes espalhadas em varios lugares.

## Como adicionar um novo agente especialista

No review, especialistas sao blocos bem definidos.

Para criar um novo especialista:

1. definir o objetivo da analise;
2. criar a classe do agente;
3. adicionar bloco de prompt correspondente;
4. incluir o agente no grafo de linguagem;
5. decidir como o aggregator deve consumir a nova saida;
6. atualizar contratos, se necessario;
7. adicionar testes.

## Como adicionar uma nova tool deterministica

As tools sao uma boa porta de extensao quando o comportamento pode ser
expresso por heuristica objetiva.

O caminho geral seria:

1. criar ou expandir o runner deterministico do fluxo;
2. devolver achados em formato compativel com o contexto do agente;
3. registrar o step no grafo;
4. ajustar prompts se o agente passar a consumir esse novo sinal.

## Como adicionar um novo bloco de prompt

Quando um fluxo precisa de governanca mais fina, um novo bloco pode ser uma boa
evolucao.

O processo natural seria:

1. incluir o novo `PromptBlockKey`;
2. ajustar schema e validacoes da camada de prompts;
3. atualizar seed, se fizer sentido;
4. ajustar o resolver de runtime;
5. adaptar o fluxo que vai consumir esse bloco;
6. refletir a mudanca no painel de prompts.

## Como adicionar um novo modelo

Se o objetivo for apenas experimentar um novo modelo ja suportado pelo
OpenRouter, o caminho mais simples e administrativo:

1. cadastrar em `/api/v1/models`;
2. ativar ou definir como padrao;
3. testar via override por request ou como default global.

Se a evolucao exigir outro provider, o impacto e maior e tende a envolver:

- camada de factory do chat model;
- telemetria;
- retry;
- shape de custo e metadata.

## Como evoluir PR review

O fluxo `pull_request_review` ja esta desenhado para crescer por secoes.

Alguns exemplos de evolucao natural:

- novo agente de performance;
- novo agente de observabilidade;
- leitura de mais fontes de contexto;
- ampliacao da carga de padroes do projeto;
- novas secoes no aggregator final.

## Como evoluir PR tests

O fluxo de testes por PR pode crescer em especial nos pontos:

- heuristicas de extracao de funcoes criticas;
- suporte mais forte a classes e metodos;
- enriquecimento do contexto do diff;
- estrategias especificas por framework.

## Como evoluir historico e analytics

A modelagem atual ja oferece boa base para:

- novos filtros;
- novos agrupamentos;
- dashboards mais ricos;
- comparacao entre modelos;
- comparacao entre versoes de prompt.

Em outras palavras: a base ja esta preparada para evoluir de observacao
operacional simples para analise mais profunda.

## Como evoluir o painel web

O painel tambem foi separado por features, o que favorece crescimento por tela.

Evolucoes naturais incluem:

- filtros mais ricos no dashboard;
- visualizacao lado a lado de prompts;
- editor mais avancado de blocos;
- telas especificas para PR review e PR tests;
- comparador de custo por modelo.

## Boas praticas para evoluir esta base

As melhores evolucoes tendem a seguir alguns principios:

- manter contratos e implementacao alinhados;
- preferir extensao modular a refatoracoes amplas desnecessarias;
- preservar rastreabilidade e steps;
- adicionar testes junto com novas capacidades;
- documentar cada novo comportamento em README, Swagger e docs.

## O que nao vale a pena fazer cedo demais

Algumas evolucoes podem parecer atraentes, mas nao sao prioridade imediata para
esta base:

- microservicacao precoce;
- excesso de abstracoes para todos os fluxos;
- provider-agnostic generico demais antes de necessidade real;
- fila distribuida complexa sem demanda operacional concreta.

## Relacao com os proximos capitulos

Depois deste capitulo, o capitulo mais util para sustentar a manutencao do
projeto no dia a dia e `14-troubleshooting-faq.md`.
