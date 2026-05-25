# Manual de Desenvolvimento TR Padrão — Python

Este documento define as regras de desenvolvimento, arquitetura, convenções de código e nomenclatura para projetos em **Python** na **TR Padrão** (Juscash). 

Para manter o alinhamento com a nossa stack de Node.js + TypeScript, o padrão de desenvolvimento em Python adapta os mesmos conceitos de **Arquitetura Modular baseada em Camadas (Layered Modular Architecture)**, com isolamento de regras de negócio, validações rígidas de entrada, logs estruturados e tratamento de erros centralizado.

---

## 1. Visão Geral da Arquitetura (FastAPI + Pydantic + SQLModel)

Adotamos o **FastAPI** como o framework web corporativo padrão para APIs em Python. Ele é o equivalente moderno ao Express + TypeScript por oferecer:
1. **Type Safety com Type Hints**: Validação e tipagem estática nativa do Python, garantindo autocomplete e segurança contra erros de tipo em tempo de execução.
2. **Pydantic**: O equivalente perfeito ao **Zod** para validação de esquemas (Request Body, Query Params e Path Params).
3. **Auto-Documentação (OpenAPI / Swagger)**: O FastAPI gera automaticamente a documentação interativa dos endpoints sem a necessidade de manter blocos de comentários Swagger manuais.
4. **Nativamente Assíncrono (async/await)**: Performance excepcional baseada em concorrência assíncrona, idêntica ao modelo de concorrência do Node.js.

---

## 2. Estrutura de Diretórios do Projeto

Adaptamos a nossa arquitetura modular de TypeScript para seguir as convenções de pacotes do Python (PEP 396/PEP 420):

```
src/
├── core/                     # Recursos globais e transversais compartilhados (Cross-cutting)
│   ├── config.py             # Configurações globais e variáveis de ambiente (Pydantic Settings)
│   ├── database.py           # Conexão de banco e pool de sessões (SQLAlchemy / SQLModel)
│   ├── exceptions.py         # Definição e mapeador global de erros (AppException)
│   ├── logging.py            # Configuração estruturada de logs do Winston equivalente em Python
│   └── security.py           # Middlewares de autenticação e utilitários de hash/segurança
│
├── modules/                  # Módulos de domínio de negócio (funcionalidades isoladas)
│   ├── analise_ml/           # Exemplo de módulo (uso de snake_case para pastas)
│   │   ├── __init__.py
│   │   ├── router.py         # Mapeamento de endpoints HTTP (FastAPI APIRouter)
│   │   ├── controllers.py    # Controladores HTTP (validação e orquestração)
│   │   ├── services.py       # Regras de negócio puras (Services)
│   │   ├── repositories.py   # Consultas e escritas em banco de dados
│   │   ├── schemas.py        # Modelos Zod equivalentes do Pydantic (DTOs)
│   │   └── models.py         # Modelos de Entidade de Banco de Dados (SQLModel/SQLAlchemy)
│   │
│   └── __init__.py           # Inicializa o pacote de módulos
│
├── app.py                    # Entrypoint da aplicação (Instancia e configura o FastAPI)
└── requirements.txt / pyproject.toml # Gerenciador de dependências e empacotamento
```

---

## 3. Convenções de Nomenclatura (PEP 8)

Ao contrário do TypeScript que utiliza `camelCase`, em Python devemos seguir rigorosamente a especificação **PEP 8** para que o código seja pythônico, limpo e legível por qualquer desenvolvedor da comunidade.

| Elemento | Convenção | Exemplo em TypeScript | Equivalente em Python |
| :--- | :--- | :--- | :--- |
| **Classes** | `PascalCase` | `AnaliseMlController` | `AnaliseMlController` |
| **Métodos e Funções** | `snake_case` | `consolidarScoreClientes()` | `consolidar_score_clientes()` |
| **Variáveis e Argumentos** | `snake_case` | `usuarioId` | `usuario_id` |
| **Constantes** | `UPPER_SNAKE_CASE` | `MAX_RETRIES` | `MAX_RETRIES` |
| **Interfaces/Esquemas/Modelos**| `PascalCase` | `PloomesContexto` | `PloomesContexto` (Pydantic BaseModel) |
| **Arquivos e Módulos** | `snake_case` | `dateUtils.ts` | `date_utils.py` |
| **Diretórios / Pacotes** | `snake_case` | `analise-ml` | `analise_ml` |

> [!TIP]  
> Como as tabelas e campos do nosso banco de dados já usam `snake_case` (ex: `ml_processos`, `id_individuo`), a adoção de `snake_case` para variáveis em Python elimina a necessidade de mapeamento estrito de nomenclatura nas queries, tornando a integração de dados muito mais fluida e intuitiva!

---

## 4. Padrão de Implementação das Camadas em Python

### 4.1 Camada de Apresentação: Routers & Controllers
No FastAPI, as rotas são definidas utilizando um `APIRouter`. A validação e coerção de dados ocorrem de forma transparente através da assinatura dos métodos do endpoint usando classes do **Pydantic**.

#### Diretrizes para Controllers em Python:
1. **Injeção de Dependência**: Use o sistema `Depends` do FastAPI para injetar sessões de banco de dados e instâncias de serviços.
2. **Declaração de Response Model**: Sempre defina o parâmetro `response_model` no decorator do endpoint para garantir o parse automático e impedir vazamento de dados confidenciais do banco.
3. **Mapeamento de Exceções**: Exceções de negócio levantadas nas camadas inferiores devem ser capturadas e tratadas por Exception Handlers globais (semelhante ao middleware global de Express).

```python
# src/modules/analise_ml/router.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db_session
from .schemas import MotorCreateSchema, MotorResponseSchema
from .services import analise_ml_service

router = APIRouter(prefix="/motores", tags=["Motores ML"])

@router.post(
    "/",
    response_model=MotorResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um novo motor de análise ML"
)
async def create_motor(
    payload: MotorCreateSchema,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Cria um novo motor de execução de IA/ML na TR Padrão.
    """
    # Orquestração delegada para a camada de serviços
    created_motor = await analise_ml_service.create_motor(payload, db)
    return created_motor
```

---

### 4.2 Camada de Negócio: Services
Os serviços contêm toda a lógica de negócio pura da TR Padrão. Eles realizam chamadas a repositórios, integram APIs parceiras (Ploomes, JusBR) e disparam eventos.

#### Diretrizes para Services em Python:
1. **Lógica Pura e Assíncrona**: Sempre que houver chamadas de IO (banco, APIs), use funções assíncronas (`async def`) e aguarde com `await`.
2. **Propagação de Exceções de Domínio**: Em caso de erros de negócio, lance exceções customizadas de domínio (`src.core.exceptions`).
3. **Singleton Pattern**: Instancie a classe de serviço no final do arquivo para exportá-la como um Singleton.

```python
# src/modules/analise_ml/services.py
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.exceptions import NotFoundException, ExternalServiceException
from .schemas import MotorCreateSchema
from .repositories import analise_ml_repository

logger = logging.getLogger(__name__)

class AnaliseMlService:
    async def create_motor(self, payload: MotorCreateSchema, db: AsyncSession):
        try:
            # 1. Validação de Regra de Negócio (ex: verificar duplicidade)
            existente = await analise_ml_repository.find_by_nome(payload.nome, db)
            if existente:
                raise ConflictException(f"Já existe um motor cadastrado com o nome: {payload.nome}")

            # 2. Persistência
            motor = await analise_ml_repository.create(payload, db)
            
            logger.info(f"Motor ML '{motor.nome}' criado com sucesso ID: {motor.id}")
            return motor

        except Exception as error:
            logger.error(f"Erro ao criar motor ML na camada de serviço: {str(error)}", exc_info=True)
            raise error

# Exportação como Singleton
analise_ml_service = AnaliseMlService()
```

---

### 4.3 Camada de Dados: Repositories
Centralize a execução de queries SQL no arquivo de repositório. Em Python, utilizamos o **SQLAlchemy** de forma assíncrona para mapear os dados.

#### Diretrizes para Repositories em Python:
1. **Sessão Injetada**: Os métodos do repositório devem receber a sessão de banco de dados (`AsyncSession`) como parâmetro obrigatório (evitando acoplamento estático global de conexão).
2. **Captura de Erros do Banco**: Qualquer falha de banco de dados deve ser capturada e convertida em uma exceção interna do sistema (`DatabaseException`).

```python
# src/modules/analise_ml/repositories.py
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.core.exceptions import DatabaseException
from .models import MlMotor
from .schemas import MotorCreateSchema

logger = logging.getLogger(__name__)

class AnaliseMlRepository:
    async def find_by_nome(self, nome: str, db: AsyncSession) -> MlMotor | None:
        try:
            query = select(MlMotor).where(MlMotor.nome == nome)
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as error:
            logger.error(f"Erro ao buscar motor por nome no banco: {str(error)}")
            raise DatabaseException("Erro de persistência de dados", cause=error)

    async def create(self, payload: MotorCreateSchema, db: AsyncSession) -> MlMotor:
        try:
            db_motor = MlMotor(
                nome=payload.nome,
                descricao=payload.descricao,
                url_api=str(payload.url_api),
                producao=payload.producao
            )
            db.add(db_motor)
            await db.commit()
            await db.refresh(db_motor)
            return db_motor
        except Exception as error:
            await db.rollback()
            logger.error(f"Erro ao criar motor no banco de dados: {str(error)}")
            raise DatabaseException("Erro ao salvar motor no banco", cause=error)

analise_ml_repository = AnaliseMlRepository()
```

---

### 4.4 Validação e Esquemas de Dados: Pydantic
O **Pydantic** é a biblioteca padrão em Python para parsing, validação e coerção de tipos. Ele desempenha exatamente o mesmo papel do **Zod** em TypeScript.

```python
# src/modules/analise_ml/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional

# Esquema para criação (DTO - Data Transfer Object)
class MotorCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255, description="Nome do motor ML")
    descricao: str = Field(..., min_length=1, max_length=800, description="Breve descrição")
    url_api: HttpUrl = Field(..., description="URL de endpoint da API do motor")
    producao: Optional[bool] = Field(default=False, description="Define se é o motor ativo em produção")

# Esquema para resposta (Filtra dados de saída)
class MotorResponseSchema(BaseModel):
    id: int
    nome: str
    descricao: str
    url_api: str
    producao: bool

    class Config:
        # Permite mapeamento direto de objetos ORM do SQLAlchemy
        from_attributes = True
```

---

### 4.5 Hierarquia de Exceções Customizadas (AppException)
Lançamos exceções tipadas de acordo com as falhas operacionais do sistema para que a resposta HTTP seja padronizada de maneira automática:

```python
# src/core/exceptions.py
class AppException(Exception):
    """Exceção base para erros operacionais controlados da TR Padrão."""
    def __init__(self, message: str, status_code: int = 500, details: any = None, cause: Exception = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details
        self.cause = cause

class ValidationError(AppException):
    def __init__(self, message: str = "Dados de entrada inválidos", details: any = None):
        super().__init__(message, status_code=422, details=details)

class NotFoundException(AppException):
    def __init__(self, message: str = "Recurso não encontrado"):
        super().__init__(message, status_code=404)

class ConflictException(AppException):
    def __init__(self, message: str = "Conflito de dados no sistema"):
        super().__init__(message, status_code=409)

class DatabaseException(AppException):
    def __init__(self, message: str = "Erro interno no banco de dados", cause: Exception = None):
        super().__init__(message, status_code=500, cause=cause)
```

No arquivo principal `app.py`, registramos o Exception Handler global para formatar o JSON de resposta idêntico ao Express:

```python
# src/app.py (Configuração do Tratamento de Erro Global)
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.core.exceptions import AppException
from datetime import datetime

app = FastAPI()

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "error": {
                "code": exc.status_code,
                "details": exc.details or str(exc.cause or "Erro operacional interno")
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )
```

---

### 4.6 Diretrizes Rigorosas de Logs em Python
A PEP 8 e as boas práticas de Clean Code em Python **proíbem** o uso de declarações `print()` para fins de log de fluxo em ambiente de produção.

- Sempre obtenha o logger corporativo no início do arquivo: `logger = logging.getLogger(__name__)`.
- Utilize formatação estruturada de logs passando variáveis no contexto apropriado:

```python
# ❌ INCORRETO
print(f"Erro ao processar lead {lead_id} {error}")

# ✅ CORRETO
logger.error("Erro ao processar lead de OAB no Ploomes", exc_info=True, extra={
    "lead_id": lead_id,
    "oab": oab_raw
})
```

---

## 5. Gerenciamento do Ciclo de Vida: Lifespan e Shutdown

No FastAPI, os eventos de inicialização e parada do servidor (como conectar/desconectar pools de banco, Redis e iniciar/parar background workers) são gerenciados de forma unificada utilizando o **lifespan context manager**:

```python
# src/app.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from src.core.database import database_manager
from src.core.logging import setup_global_logging

setup_global_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ─── FASE DE INICIALIZAÇÃO (ON STARTUP) ───
    logger.info("Iniciando serviços de banco de dados e conexões...")
    await database_manager.initialize_pools()
    
    yield  # A aplicação roda enquanto estiver aqui
    
    # ─── FASE DE ENCERRAMENTO (ON SHUTDOWN / GRACEFUL SHUTDOWN) ───
    logger.info("Encerrando conexões ativas com o banco e pools Redis...")
    await database_manager.close_pools()
    logger.info("Graceful shutdown de processos concluído com sucesso!")

app = FastAPI(lifespan=lifespan)
```

---

## 6. Processamento em Segundo Plano e Filas

Para fluxos de background robustos similares ao BullMQ, adotamos em Python o **ARQ** ou o **Celery** (utilizando Redis como broker).

Para tarefas extremamente simples, podemos utilizar as tarefas de segundo plano nativas do FastAPI (`BackgroundTasks`):

```python
from fastapi import BackgroundTasks

async def enviar_email_confirmacao(email: str):
    # Lógica de envio assíncrono
    pass

@router.post("/comprar")
async def realizar_compra(background_tasks: BackgroundTasks):
    # Processa a requisição rapidamente
    background_tasks.add_task(enviar_email_confirmacao, "cliente@email.com")
    return {"message": "Compra efetuada. E-mail de confirmação será enviado em background."}
```

---

## 7. Gerenciador de Dependências Recomendado: UV
Na TR Padrão, incentivamos o uso do **`uv`** como o instalador e gerenciador de pacotes padrão para Python devido à sua velocidade absurda (escrito em Rust) e compatibilidade perfeita com ambientes virtuais virtuais (`.venv`).

```bash
# Instalação rápida de dependências com UV
uv pip install -r requirements.txt

# Execução do projeto local
uv run uvicorn src.app:app --reload --port 4000
```

---

## 8. Checklist para Code Review em Python

Garanta que seu código atende a todos os pontos de qualidade antes do merge:

- [ ] Código segue as regras de estilo de escrita da **PEP 8** (rodar `flake8` ou `black`).
- [ ] Todas as funções de rotas e serviços possuem anotações de tipo explícitas (`Type Hints`).
- [ ] Não existem blocos `print()` perdidos para debugar; todos foram substituídos pelo `logging` estruturado.
- [ ] As consultas SQLAlchemy utilizam chamadas assíncronas (`await db.execute`).
- [ ] Entradas do cliente HTTP são validadas através de classes herdadas de `pydantic.BaseModel`.
- [ ] O banco de dados utiliza a injeção via `Depends(get_db_session)` e não importa instâncias de conexão estáticas locais nas queries.
