# Glossario

## Objetivo deste capitulo

Este glossario resume os termos tecnicos e de dominio mais usados ao longo da
documentacao do projeto.

## Termos principais

### Agent

Componente orientado a LLM que recebe contexto, segue um prompt e retorna uma
saida estruturada.

### Aggregator

Agente responsavel por consolidar as saidas de outras etapas ou especialistas em
uma resposta final unica.

### Analytics

Camada que agrega execucoes e telemetria para gerar visao operacional por dia,
por fluxo e por modelo.

### Batch

Fluxo que executa varios itens de `review`, `compliance`, `document` e `tests`
em sequencia em uma unica request.

### Cache hit

Situacao em que uma execucao reutiliza o resultado de outra chamada anterior com
o mesmo hash de payload.

### Code standards

Padroes de projeto usados no review de Pull Request para avaliar aderencia do
diff a regras ou convencoes locais.

### Compliance

Fluxo que compara tarefa e codigo para avaliar aderencia funcional.

### Controller

Camada HTTP que valida input, chama o service correto e devolve a resposta da
API.

### Deterministic tools

Heuristicas e analises previsiveis que rodam sem LLM e complementam os fluxos.

### Document

Fluxo que gera documentacao tecnica ou operacional a partir de codigo.

### Engine

Camada operacional do fluxo. Coordena cache, persistencia, telemetria, webhook
e chamada do grafo principal.

### Execution

Registro persistido de uma execucao de fluxo.

### ExecutionStep

Registro persistido de uma etapa intermediaria de execucao.

### ExecutionTelemetry

Registro persistido de tokens, custos, provider e metadados de uso do modelo.

### Flow

Capacidade funcional da API, como `review`, `compliance`, `document`, `tests`
ou `batch`.

### FlowType

Tipo logico de fluxo usado em governanca de prompts e persistencia.

### Graph

Orquestracao de nodes e transicoes que define como um fluxo de IA se comporta.

### Healthcheck

Endpoint simples usado para validar se a API esta operacional.

### History

Camada de consulta das execucoes persistidas, incluindo steps e telemetria.

### LangChain

Biblioteca usada para structured output, mensagens e integracao com o modelo.

### LangGraph

Biblioteca usada para modelar os fluxos como grafos explicitos de execucao.

### LangSmith

Ferramenta opcional de tracing para fluxos de IA.

### Model catalog

Catalogo persistido de modelos permitidos pela API.

### Model override

Substituicao pontual do modelo padrao global em uma request especifica.

### OpenAPI

Especificacao de contrato HTTP publicada pela API e usada pelo Swagger UI.

### OpenRouter

Provedor LLM utilizado como gateway para modelos e telemetria associada.

### Panel / Painel admin

Interface web administrativa em `apps/web` que consome a API.

### PR review

Fluxo de review aplicado a um Pull Request do GitHub, com Jira opcional.

### PR tests

Fluxo que gera testes unitarios a partir das alteracoes de um Pull Request.

### Prompt block

Bloco individual de prompt dentro de uma versao de fluxo, como `agent`,
`security` ou `aggregator`.

### Prompt version

Versao persistida de um conjunto de prompts de um fluxo.

### Prompt override

Uso do campo `prompt_version` para forcar uma versao especifica em uma request.

### Repository

Camada responsavel por ler ou gravar dados persistidos.

### Retry com backoff

Estrategia de repeticao de chamadas externas em falhas transitorias, com atraso
progressivo entre tentativas.

### Review

Fluxo de revisao automatizada de codigo, com especialistas por criterio.

### Service

Camada de aplicacao que intermedia controller e engine, expondo o fluxo para a
interface HTTP.

### SSE

Server-Sent Events. Mecanismo usado para stream do endpoint
`/api/v1/review/stream`.

### Step recorder

Interface usada pelos grafos para registrar etapas no historico quando houver
persistencia disponivel.

### Structured output

Resposta do LLM validada contra schema estruturado, e nao texto livre sem
contrato.

### Supported language

Conjunto de linguagens aceitas pelos fluxos de codigo:

- `typescript`
- `javascript`
- `python`
- `php`

### Tests

Fluxo que gera testes unitarios a partir de codigo informado.

### Webhook callback

POST opcional enviado pela API ao final de certos fluxos, sem substituir a
resposta HTTP principal.
