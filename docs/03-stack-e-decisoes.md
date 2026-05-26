# Stack e Decisoes Tecnicas


## Objetivo deste capitulo

Este capitulo explica quais tecnologias foram escolhidas para o case
CPJ-Cobranca AI e por que elas fazem sentido para a entrega proposta.

O foco aqui nao e apenas listar ferramentas. A ideia e mostrar como cada
decisao ajuda a atender os requisitos do case, reduzir complexidade acidental,
melhorar a avaliacao tecnica da entrega e deixar o projeto pronto para evoluir.

## Visao geral da stack

| Camada | Tecnologia principal | Papel no projeto |
| --- | --- | --- |
| Runtime backend | Node.js 22 | Execucao da API e ferramentas de build/dev |
| Linguagem backend | TypeScript 5 | Tipagem, contratos e manutencao |
| Framework HTTP | Fastify 5 | API REST, plugins, middlewares e OpenAPI |
| Validacao | Zod | Schemas de entrada e saida |
| Persistencia | Prisma + PostgreSQL 16 | Historico, prompts, modelos, cache e telemetria |
| Orquestracao de IA | LangGraph.js + LangChain.js | Fluxos, agentes, tools e structured output |
| Provedor LLM | OpenRouter | Acesso a modelos e telemetria de uso/custo |
| Observabilidade de IA | LangSmith | Tracing opcional |
| Build backend | tsup | Empacotamento rapido para producao |
| Testes backend | Vitest | Testes unitarios e de integracao leve |
| Lint | ESLint 9 | Padronizacao e qualidade estatica |
| Containers | Docker + Docker Compose | Execucao local e deploy |
| Frontend | Next.js 16 + React 19 | Painel administrativo |
| UI do frontend | Ant Design 6 | Componentes visuais do painel |
| Graficos do painel | Ant Design Charts | Custos, tokens e metricas operacionais |

## Leitura da stack sob a otica do case

O case nao exigia uma arquitetura corporativa complexa. Ele exigia algo mais
importante: uma solucao que subisse, fosse testavel, tivesse persistencia,
integrasse IA de forma util e viesse acompanhada de documentacao clara.

Por isso, as escolhas tecnicas seguiram alguns principios:

- usar tecnologias maduras e amplamente conhecidas;
- reduzir atrito para rodar localmente e em Docker;
- preservar clareza para avaliacao de codigo;
- separar bem responsabilidades sem exagerar na abstracao;
- permitir evolucao real em cima da base entregue.

## Backend

### Node.js 22

O backend roda sobre Node.js 22, que oferece um ambiente moderno, estavel e
adequado para aplicacoes HTTP, integracoes externas e orquestracao de fluxos de
IA.

Essa escolha ajuda o case em tres pontos:

- simplifica o uso de bibliotecas atuais do ecossistema TypeScript;
- conversa bem com Fastify, Prisma, LangChain e LangGraph;
- reduz barreiras para rodar localmente, em CI e em container.

### TypeScript 5

TypeScript foi escolhido para dar previsibilidade ao projeto inteiro: contratos
HTTP, estruturas retornadas pelos agentes, modelos persistidos e integracoes
internas.

No contexto do case, isso importa porque a avaliacao considera qualidade de
codigo, clareza arquitetural e confiabilidade da entrega. A tipagem ajuda a:

- documentar intencoes no proprio codigo;
- reduzir ambiguidade entre schema, implementacao e testes;
- facilitar manutencao conforme novos fluxos forem adicionados.

O projeto combina TypeScript com Zod para aproximar tipo estatico e validacao
em runtime, evitando depender apenas do compilador para entradas externas.

### Fastify 5

Fastify foi escolhido como framework da API por ser enxuto, rapido e muito bom
para projetos modulares baseados em plugins, rotas e schemas.

Ele atende bem ao case porque permite:

- montar uma API REST clara e organizada;
- registrar middlewares, CORS, rate limit e seguranca com pouco atrito;
- integrar Swagger/OpenAPI de forma nativa;
- manter o codigo de bootstrap pequeno e legivel.

Em uma entrega de case, essa clareza pesa bastante: o avaliador consegue
entender facilmente como a aplicacao sobe, como as rotas entram e como os
modulos se conectam.

### Zod

Zod foi usado para validar payloads de entrada e estruturar dados de saida dos
fluxos. Essa escolha conversa diretamente com um dos riscos naturais de projetos
com LLM: receber dados livres demais ou respostas inconsistentes.

Com Zod, a aplicacao ganha:

- validacao previsivel nas bordas da API;
- contratos reutilizaveis entre backend, testes e documentacao;
- menor risco de aceitar requests invalidas ou propagar estruturas quebradas.

## Persistencia

### PostgreSQL 16

PostgreSQL foi escolhido como banco relacional principal porque o projeto
precisa guardar historico de execucoes, steps, telemetria, prompts versionados,
catalogo de modelos e dados de batch de forma consistente.

Para o case, um banco relacional faz sentido porque:

- o historico precisa ser consultavel e auditavel;
- prompts e modelos possuem relacoes e estados bem definidos;
- a avaliacao valoriza modelagem coerente e persistencia real.

### Prisma

Prisma foi adotado como camada de acesso a dados. A escolha equilibra
produtividade, legibilidade e seguranca de tipos sem esconder totalmente a
modelagem do banco.

Ele foi especialmente util aqui para:

- manter schema e codigo alinhados;
- simplificar migrations e seed inicial;
- facilitar queries de historico, analytics e governanca;
- reduzir a quantidade de SQL manual no fluxo principal.

O uso de Prisma tambem melhora a experiencia do avaliador, porque o schema fica
centralizado e mais facil de ler do que uma camada de persistencia espalhada em
strings SQL soltas.

## IA e orquestracao

### LangGraph.js

LangGraph foi escolhido para modelar os fluxos de IA como grafos explicitos, e
nao como uma unica chamada monolitica ao modelo.

Isso combina com o problema do case porque varios fluxos possuem etapas
distintas: validacoes, roteamento por linguagem, tools deterministicas,
especialistas e agregacao final.

Os ganhos principais sao:

- visibilidade de etapas;
- melhor separacao entre responsabilidades;
- possibilidade de registrar steps no historico;
- facilidade para evoluir fluxos sem reescrever tudo.

### LangChain.js

LangChain foi usado como camada de integracao com modelo, structured output e
composicao de comportamento dos agentes.

Neste projeto, ele funciona como complemento do LangGraph:

- LangGraph organiza o fluxo;
- LangChain ajuda a padronizar a conversa com o LLM.

Essa combinacao foi uma escolha boa para o case porque permitiu construir algo
mais robusto do que um wrapper simples de `fetch`, sem transformar a entrega em
uma plataforma excessivamente abstrata.

### OpenRouter

OpenRouter foi escolhido como provedor LLM por permitir acesso a diferentes
modelos por uma interface unica, mantendo flexibilidade de custo e troca de
modelo.

Para o case, isso tem varias vantagens:

- facilita documentar modelo padrao e alternativas;
- reduz acoplamento a um unico vendor;
- combina bem com o catalogo de modelos persistido no banco;
- permite capturar metadados de uso e custo quando disponiveis.

O projeto ainda adiciona retry configuravel com backoff nas chamadas externas,
o que melhora resiliencia sem exigir um provedor proprietario adicional.

### LangSmith

LangSmith entra como tracing opcional. Ele nao e necessario para rodar o
projeto, mas foi mantido como diferencial para observabilidade de fluxos de IA.

Essa decisao e importante porque equilibra dois objetivos:

- oferecer um caminho de diagnostico mais avancado;
- nao bloquear setup local ou avaliacao quando a chave nao estiver disponivel.

## Qualidade de codigo e entrega

### Vitest

Vitest foi escolhido para testes por ter boa ergonomia no ecossistema
TypeScript, execucao rapida e sintaxe simples.

Ele cobre bem o que o case precisa demonstrar:

- validacao de contratos;
- verificacao de rotas;
- testes de servicos e repositorios;
- protecao contra regressao em integrações e config.

### ESLint 9

ESLint ajuda a manter consistencia e legibilidade do codigo. Em um case tecnico,
isso importa nao apenas por padrao de estilo, mas porque pequenas inconsistencias
acabam dificultando leitura e revisao.

### tsup

`tsup` foi escolhido para o build do backend por ser simples, rapido e
suficiente para uma API Node.js deste porte.

Essa decisao evita um pipeline de build pesado demais e deixa claro que a
prioridade aqui e a entrega funcional do servico, nao uma sofisticacao
desnecessaria no empacotamento.

## Frontend e experiencia operacional

### Next.js 16 + React 19

O painel web foi construido com Next.js e React para oferecer uma interface
tecnica de apoio ao avaliador e ao operador da API.

Essa escolha foi util porque:

- facilita criar paginas administrativas rapidamente;
- funciona bem em uma estrutura de workspace junto com a API;
- entrega uma interface moderna sem exigir uma aplicacao frontend isolada e
  excessivamente customizada.

No contexto do case, o painel nao substitui a API, mas melhora muito a
avaliacao da entrega ao mostrar historico, prompts, modelos, status e execucao
guiada dos fluxos.

### Ant Design 6

Ant Design foi escolhido para acelerar a construcao de uma interface com cara
de ferramenta operacional, e nao de landing page.

Isso combina com o publico do projeto:

- avaliador tecnico;
- desenvolvedor;
- pessoa operando os fluxos ou inspecionando historico.

A biblioteca oferece tabelas, formularios, layout, componentes de feedback e
elementos administrativos prontos, o que ajudou a manter foco na funcionalidade
em vez de gastar tempo excessivo com design do zero.

### Ant Design Charts

Os graficos foram usados para apoiar a visualizacao de custos, tokens e uso no
painel. E uma escolha pragmatica: reaproveita o ecossistema visual da propria
stack do frontend e acelera a entrega de metricas operacionais.

## Containers, setup e deploy

### Docker e Docker Compose

Docker e Docker Compose foram escolhidos porque o case exigia uma entrega
containerizada e com setup reproduzivel.

Essa escolha ajuda diretamente nos criterios de avaliacao:

- sobe API, banco e painel de forma consistente;
- reduz diferencas entre ambiente local e ambiente de deploy;
- simplifica demonstracao;
- facilita automacao no GitHub Actions e deploy em VPS.

Tambem foi uma decisao importante para confiabilidade da entrega: quando a
documentacao diz `docker compose up --build`, o projeto de fato foi preparado
para seguir esse caminho.

## Trade-offs assumidos

Nem toda escolha foi sobre maximizar poder tecnico. Algumas foram sobre manter a
solucao avaliavel e sustentavel dentro do tempo do case.

Os principais trade-offs foram:

- **usar Fastify em vez de um framework mais opinativo**: menos estrutura
  pronta, mas mais controle e menos peso;
- **usar Prisma em vez de SQL manual em toda a aplicacao**: mais produtividade e
  legibilidade, com menor controle fino em consultas muito especificas;
- **usar OpenRouter em vez de integrar varios providers diretamente**: mais
  simplicidade operacional, com dependencia de um gateway unico;
- **usar painel admin com Ant Design em vez de frontend altamente customizado**:
  mais velocidade de entrega e melhor foco no uso tecnico;
- **usar LangGraph/LangChain sem exagerar em camadas proprietarias**: melhor
  estrutura para os fluxos, preservando legibilidade do codigo.

## Decisao central da stack

Se fosse resumir a logica da stack em uma frase, seria esta:

> construir uma base tecnica moderna, testavel e rastreavel, usando ferramentas
> conhecidas o suficiente para facilitar avaliacao e evolucao, sem transformar o
> case em uma arquitetura maior do que o problema pedia.

## Relacao com os proximos capitulos

Depois deste capitulo, a leitura natural e:

- `04-arquitetura.md`, para entender como essa stack foi organizada no codigo;
- `05-fluxos-de-ia-e-agentes.md`, para detalhar o papel de LangGraph,
  LangChain, tools, especialistas e aggregator;
- `10-como-rodar.md`, para ver a stack em execucao local e em Docker.
