# Como Rodar

## Objetivo deste capitulo

Este capitulo mostra como executar o projeto localmente, com e sem Docker, e
como validar rapidamente que a aplicacao subiu corretamente.

## Pre-requisitos

Para rodar o projeto localmente, o ambiente esperado inclui:

- Node.js 22 ou superior;
- npm;
- Docker e Docker Compose;
- PostgreSQL local, caso opte por rodar sem container para o banco.

## Instalar dependencias

```bash
npm install
```

O `postinstall` do projeto executa `prisma generate`, entao o Prisma Client
fica preparado logo na instalacao.

## Variaveis de ambiente

O ponto de partida e `.env.example`.

```bash
cp .env.example .env
```

### Variaveis mais importantes

- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_DEFAULT_MODEL`
- `EXTERNAL_RETRY_ATTEMPTS`
- `EXTERNAL_RETRY_BASE_DELAY_MS`
- `NEXT_PUBLIC_API_BASE_URL`

### Variaveis opcionais de integracao

- `GITHUB_TOKEN`
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `LANGSMITH_TRACING`
- `LANGSMITH_API_KEY`
- `LANGSMITH_PROJECT`
- `WEBHOOK_CALLBACK_URL`

## Rodando em desenvolvimento local

### 1. Subir PostgreSQL

Se quiser usar apenas o banco em container:

```bash
docker compose up -d postgres
```

### 2. Ajustar `.env`

Em ambiente local sem a API em container, a `DATABASE_URL` padrao deve apontar
para `localhost`.

### 3. Rodar migrations e seed

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Ou, se preferir os scripts do projeto:

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 4. Iniciar a API

```bash
npm run dev
```

### 5. Iniciar o painel web

Em outro terminal:

```bash
npm run dev:web
```

## URLs locais esperadas

Com tudo no ar:

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/docs`
- Painel: `http://localhost:3001`

## Rodando com Docker Compose

Para subir API, banco e painel juntos:

```bash
cp .env.example .env
docker compose up --build -d
```

### Observacoes importantes

- em Docker, a API usa `postgres` como host de banco;
- a API executa `prisma migrate deploy` e `prisma db seed` antes de subir;
- o painel sobe apontando para `http://localhost:3000` por padrao.

## Logs uteis

### API

```bash
docker compose logs -f api
```

### Painel web

```bash
docker compose logs -f web
```

### Banco

```bash
docker compose logs -f postgres
```

## Validacao rapida de subida

### Healthcheck

```bash
curl http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "ok"
}
```

### Swagger

Abrir:

```text
http://localhost:3000/docs
```

### Painel

Abrir:

```text
http://localhost:3001
```

## Validacao manual dos fluxos

O caminho mais rapido para validar os endpoints e:

- abrir `requests/cpj-cobranca-api.http`;
- executar os exemplos principais;
- conferir o historico em `/api/v1/history`;
- abrir o painel e validar dashboard, prompts, modelos e execute page.

## Ordem recomendada de verificacao

1. `GET /health`
2. `GET /docs`
3. `POST /api/v1/review`
4. `GET /api/v1/history`
5. painel em `http://localhost:3001`

## Rodando somente a web

Se a API ja estiver no ar em outro endereco, basta ajustar:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

E depois subir a web:

```bash
npm run dev:web
```

## Rodando build de producao localmente

### API

```bash
npm run build
npm start
```

### Web

```bash
npm run build:web
npm run start --workspace apps/web
```

## Problemas comuns logo na subida

- `OPENROUTER_API_KEY` vazia: fluxos com LLM nao executam corretamente;
- `DATABASE_URL` errada: migrations e API falham ao conectar;
- banco ainda nao pronto: a API pode falhar em boot se a dependencia nao estiver
  acessivel;
- `NEXT_PUBLIC_API_BASE_URL` incorreta: o painel sobe, mas nao consegue carregar
  dados;
- `GITHUB_TOKEN` ausente: PR review e PR tests podem falhar em repositorios que
  exigem autenticacao.

## Comandos de desenvolvimento mais usados

```bash
npm run dev
npm run dev:web
npm test
npm run typecheck
npm run lint
npm run build
npm run build:web
```

## Relacao com os proximos capitulos

Depois deste capitulo, a leitura natural e:

- `11-deploy-operacao.md`
- `12-testes-validacao.md`
- `14-troubleshooting-faq.md`
