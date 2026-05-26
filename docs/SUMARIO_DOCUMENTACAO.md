# Sumario Mestre da Documentacao Tecnica

## Objetivo

Este arquivo define o roteiro da documentacao tecnica do case CPJ-Cobranca AI.
A documentacao completa sera escrita em arquivos Markdown separados dentro de
`docs/`, mas apenas um documento sera produzido por vez.

O objetivo e construir uma documentacao clara, profunda e revisavel, capaz de
mostrar para um avaliador tecnico o que o projeto faz, como foi pensado, como
rodar, como validar, como operar e como evoluir a solucao.

## Publico-alvo

O publico principal e o avaliador tecnico do case.

A documentacao deve ajudar esse avaliador a:

- entender rapidamente o proposito do projeto;
- enxergar os diferenciais tecnicos implementados;
- navegar pela arquitetura sem precisar ler o codigo inteiro primeiro;
- executar a API e o painel web localmente;
- validar os fluxos principais;
- avaliar escolhas de tecnologia, testes, persistencia, IA, deploy e extensibilidade.

## Regra de trabalho

- Este sumario mestre sera validado antes da escrita dos capitulos.
- Cada capitulo sera criado em um arquivo Markdown separado.
- Apenas um capitulo sera escrito por vez.
- Depois de cada capitulo, o conteudo ficara em revisao.
- O proximo capitulo so sera iniciado apos aprovacao explicita do capitulo anterior.
- Nenhum arquivo de capitulo sera criado antecipadamente com conteudo incompleto.

## Status possiveis

| Status | Significado |
| --- | --- |
| `planejado` | Capitulo definido no sumario, mas ainda nao escrito. |
| `em escrita` | Capitulo em producao. |
| `em revisao` | Capitulo escrito e aguardando validacao. |
| `aprovado` | Capitulo revisado e aprovado. |

## Sumario planejado

| Ordem | Arquivo | Status | Sumario interno |
| --- | --- | --- | --- |
| 1 | `01-introducao.md` | `aprovado` | Objetivo do case; problema resolvido; visao geral da solucao; principais diferenciais; leitura rapida do que foi entregue. |
| 2 | `02-escopo-funcional.md` | `em revisao` | Fluxos implementados: review, compliance, document, tests, batch, review de Pull Request, geracao de testes por Pull Request, historico, analytics, prompts, modelos e painel web. |
| 3 | `03-stack-e-decisoes.md` | `planejado` | Tecnologias usadas e justificativas: TypeScript, Fastify, Prisma, PostgreSQL, LangGraph, LangChain, OpenRouter, LangSmith, Docker, Next.js, React e Ant Design. |
| 4 | `04-arquitetura.md` | `planejado` | Arquitetura geral; camadas; modulos; responsabilidades; ciclo de uma request; injecao de dependencias; diagramas Mermaid. |
| 5 | `05-fluxos-de-ia-e-agentes.md` | `planejado` | Engines; graphs; tools deterministicas; agentes especialistas; aggregator; structured output; cache; telemetria; webhooks; fluxos de PR. |
| 6 | `06-api-contratos-e-exemplos.md` | `planejado` | Endpoints publicos; payloads; respostas; SSE; batch; erros; exemplos HTTP; uso de `model` e `prompt_version`. |
| 7 | `07-dados-cache-telemetria.md` | `planejado` | Schema Prisma; execucoes; steps; historico; telemetria; tokens; custos; cache por hash; resumo de batch. |
| 8 | `08-prompts-modelos-governanca.md` | `planejado` | Versionamento de prompts; blocos; ativacao de versoes; catalogo de modelos; modelo padrao global; override por request. |
| 9 | `09-painel-web-admin.md` | `planejado` | Painel Next.js; Dashboard; Historico; Prompts; Modelos; Executar Fluxos; Status/API Docs; integracao com a API. |
| 10 | `10-como-rodar.md` | `planejado` | Pre-requisitos; `.env`; instalacao; banco local; migrations; seed; API em desenvolvimento; painel web; Docker Compose; validacoes manuais. |
| 11 | `11-deploy-operacao.md` | `planejado` | Docker de producao; Compose; Nginx; GitHub Actions; secrets; deploy em VPS; logs; variaveis de ambiente; troubleshooting operacional. |
| 12 | `12-testes-validacao.md` | `planejado` | Testes automatizados; comandos de qualidade; validacao manual; criterios de aceite; como comprovar que o case esta funcionando. |
| 13 | `13-extensibilidade.md` | `planejado` | Como adicionar novo fluxo; nova linguagem; novo agente; nova tool; novo endpoint; novo prompt block; novo modelo; proximos passos tecnicos. |
| 14 | `14-troubleshooting-faq.md` | `planejado` | Problemas comuns e solucoes: env, OpenRouter, banco, migrations, webhook, GitHub, Jira, LangSmith, CORS e painel web. |
| 15 | `15-glossario.md` | `planejado` | Termos tecnicos e de dominio usados no projeto: flow, engine, graph, agent, tool, structured output, telemetry, cache hit, prompt version e model catalog. |

## Ordem de execucao

1. Validar este sumario mestre.
2. Escrever `01-introducao.md`.
3. Revisar e aprovar `01-introducao.md`.
4. Escrever `02-escopo-funcional.md`.
5. Repetir o ciclo de escrita, revisao e aprovacao ate `15-glossario.md`.

## Criterios de validacao deste sumario

- O sumario cobre o projeto completo do branch `development`.
- Os nomes dos arquivos estao claros e ordenados.
- A ordem dos capitulos ajuda o avaliador tecnico a entender o case aos poucos.
- O arquivo nao contem a documentacao completa, apenas o roteiro validavel.
- O fluxo de trabalho deixa explicito que cada capitulo sera feito e aprovado
  individualmente.
