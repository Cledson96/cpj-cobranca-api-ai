# Manual de Desenvolvimento TR Padrão — PHP Puro (Modern PHP 8.2+)

Este documento define as regras de desenvolvimento, arquitetura, convenções de código e nomenclatura para projetos escritos em **PHP puro (sem frameworks)** na **TR Padrão** (Juscash). 

Para garantir que desenvolvedores TypeScript/Node.js e Python se sintam em casa, o padrão em PHP puro foi estruturado para refletir a mesma **Arquitetura Modular baseada em Camadas (Layered Modular Architecture)**, com forte acoplamento às boas práticas modernas do ecossistema PHP (PHP 8.2+), padrões da comunidade (**PSR - PHP Standard Recommendations**) e strict types.

---

## 1. Pilares do PHP Moderno na TR Padrão

Construir aplicações em PHP puro no cenário moderno exige disciplina arquitetural. Adotamos os seguintes pilares técnicos:

1. **Front Controller Pattern**: Todas as requisições HTTP entram por um único arquivo (`public/index.php`), que centraliza a inicialização da aplicação, o carregamento do ambiente, o roteamento e o tratamento global de erros.
2. **PSR-4 Autoloading**: Utilização do **Composer** para gerenciar dependências e realizar o carregamento automático de classes. **É expressamente proibido o uso de `require` ou `include` para carregar classes.**
3. **Strict Types**: Todo arquivo PHP deve iniciar obrigatoriamente com a diretiva `declare(strict_types=1);` para impor verificação rigorosa de tipos pelo interpretador.
4. **Programação Assíncrona/Semi-Assíncrona**: Utilização de PDO com transações bem delimitadas e filas de execução.
5. **PSR-3 Logger & Monolog**: Padronização dos logs da aplicação. **É proibido o uso de `echo`, `print_r` ou `var_dump` em ambiente de produção.**

---

## 2. Estrutura de Diretórios do Projeto

Nossos projetos em PHP seguem a seguinte estrutura organizacional:

```
/projeto-php
├── bin/                      # Scripts executáveis de linha de comando (CLI)
├── config/                   # Configurações estáticas de banco, ambiente e cache
├── public/                   # Raiz pública do servidor web (único diretório exposto)
│   └── index.php             # Front Controller (Entrypoint)
│
├── src/                      # Código fonte da aplicação (Namespace App\)
│   ├── Core/                 # Recursos transversais e compartilhados (Shared)
│   │   ├── Database.php      # Gerenciador de conexão PDO (Connection Manager)
│   │   ├── Exceptions.py     # Classes de erro do sistema (AppException)
│   │   ├── Logger.php        # Configuração do Monolog (PSR-3)
│   │   ├── Router.php        # Roteador HTTP simplificado em PHP puro
│   │   └── Response.php      # Formatador unificado de JSON (Response Formatter)
│   │
│   ├── Modules/              # Módulos de domínio de negócio isolados
│   │   ├── AnaliseMl/        # Módulo de Análise de Machine Learning
│   │   │   ├── Controllers/  # Controladores HTTP
│   │   │   ├── Services/     # Camada de lógica de negócio pura
│   │   │   ├── Repositories/ # Acesso a dados via SQL/PDO
│   │   │   ├── DTOs/         # Data Transfer Objects (Validação / Pydantic equiv.)
│   │   │   ├── Models/       # Entidades de Dados representativas
│   │   │   └── Routes.php    # Mapeamento local do roteamento do módulo
│   │   └── __init__.php
│
├── var/                      # Arquivos mutáveis (arquivos de log, caches temporários)
│   ├── cache/
│   └── logs/
│
├── vendor/                   # Dependências do Composer (gerado automaticamente)
├── .env                      # Variáveis de ambiente
├── composer.json             # Dependências e mapeamento de autoloader PSR-4
└── README.md
```

---

## 3. Configuração do Composer e Autoloading (PSR-4)

O arquivo `composer.json` deve estar localizado na raiz e mapear o diretório `src/` para o namespace base `App\\`:

```json
{
    "name": "tr-padrao/projeto-php-puro",
    "description": "API em PHP Puro seguindo padrões TR Padrão",
    "type": "project",
    "require": {
        "php": ">=8.2",
        "vlucas/phpdotenv": "^5.6",
        "monolog/monolog": "^3.5"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```
*Toda vez que o namespace for alterado, execute `composer dump-autoload` para atualizar os caminhos.*

---

## 4. Convenções de Nomenclatura (PSR-12 / PER Coding Style)

Seguimos a recomendação oficial de codificação do PHP Framework Interop Group:

- **Namespaces & Classes**: Use **`PascalCase`** correspondente exatamente ao caminho físico da pasta.
  - Namespace: `App\Modules\AnaliseMl\Controllers`
  - Classe: `class ScoreClientesService {}`
  - Nome do arquivo: `ScoreClientesService.php` (deve ser idêntico ao nome da classe).
- **Métodos e Funções**: Use **`camelCase`** (idêntico ao TypeScript).
  - `consolidarScoreClientes()`
  - `listarProcessosMl()`
- **Variáveis e Parâmetros**: Use **`camelCase`** (idêntico ao TypeScript).
  - `$usuarioId`
  - `$dataUltimaAvaliacao`
- **Constantes**: Use **`UPPER_SNAKE_CASE`**.
  - `MAX_RETRIES`
  - `DB_PORT`

---

## 5. Padrões de Código e Implementação das Camadas

### 5.1 Front Controller (`public/index.php`) e Roteamento
O Front Controller intercepta todas as requisições, carrega o arquivo `.env`, inicializa o autoloader do Composer e despacha a requisição para o roteador correspondente.

```php
<?php
// public/index.php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Router;
use Dotenv\Dotenv;
use App\Core\Response;
use App\Core\Exceptions\AppException;

// 1. Carrega Variáveis de Ambiente
$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// 2. Define o Header de Resposta padrão
header('Content-Type: application/json; charset=utf-8');

try {
    // 3. Inicializa o Roteador
    $router = new Router();
    
    // Importa e registra rotas dos módulos
    (require __DIR__ . '/../src/Modules/AnaliseMl/Routes.php')($router);
    
    // Processa a rota atual
    $router->dispatch(
        $_SERVER['REQUEST_METHOD'],
        parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
    );

} catch (AppException $e) {
    // Tratamento global de erros da API
    Response::error($e->getMessage(), $e->getStatusCode(), $e->getDetails());
} catch (\Throwable $e) {
    // Erros sistêmicos não tratados (HTTP 500)
    Response::error("Erro interno do servidor", 500, $e->getMessage());
}
```

---

### 5.2 Roteador Simples em PHP Puro
Roteador simplificado para mapeamento de endpoints e injeção rápida de controllers:

```php
<?php
// src/Core/Router.php
declare(strict_types=1);

namespace App\Core;

use App\Core\Exceptions\NotFoundException;

class Router {
    private array $routes = [];

    public function add(string $method, string $path, array $handler): void {
        // Converte rotas amigáveis (ex: /motores/{id}) em regex simples
        $pathRegex = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[a-zA-Z0-9_-]+)', $path);
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => '#^' . $pathRegex . '$#',
            'handler' => $handler
        ];
    }

    public function dispatch(string $method, string $uri): void {
        $method = strtoupper($method);
        
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['path'], $uri, $matches)) {
                // Filtra parâmetros nomeados capturados pela regex
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                
                [$controllerClass, $action] = $route['handler'];
                
                // Injeção de dependência e instanciação manual
                $controller = new $controllerClass();
                $controller->$action($params);
                return;
            }
        }
        
        throw new NotFoundException("Endpoint ou rota não encontrada");
    }
}
```

---

### 5.3 Camada de Apresentação: Controllers
Os controladores HTTP recebem parâmetros da requisição, instanciam os DTOs de validação, disparam a lógica de negócio no Service correspondente e enviam a resposta via `Response` JSON.

```php
<?php
// src/Modules/AnaliseMl/Controllers/AnaliseMlController.php
declare(strict_types=1);

namespace App\Modules\AnaliseMl\Controllers;

use App\Core\Response;
use App\Modules\AnaliseMl\DTOs\MotorCreateDTO;
use App\Modules\AnaliseMl\Services\AnaliseMlService;
use Throwable;

class AnaliseMlController {
    private AnaliseMlService $service;

    public function __construct() {
        // Na falta de um container complexo de DI, instancie de forma simples
        $this->service = new AnaliseMlService();
    }

    public function createMotor(array $routeParams): void {
        try {
            // Captura o input JSON enviado
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            
            // 1. Validação de dados de entrada via DTO
            $dto = MotorCreateDTO::fromArray($input);
            
            // 2. Executa a lógica de negócio
            $result = $this->service->createMotor($dto);
            
            // 3. Retorna resposta padronizada HTTP 201
            Response::created($result, "Motor criado com sucesso");

        } catch (Throwable $e) {
            throw $e; // Repassa para o Front Controller capturar no try/catch global
        }
    }
}
```

---

### 5.4 Validação de Dados: DTOs com Constructor Promotion (PHP 8)
Para substituir ferramentas de validação como Zod e Pydantic, criamos DTOs tipados usando os recursos modernos do **PHP 8**. A validação ocorre na instanciação da classe através do método estático `fromArray`:

```php
<?php
// src/Modules/AnaliseMl/DTOs/MotorCreateDTO.php
declare(strict_types=1);

namespace App\Modules\AnaliseMl\DTOs;

use App\Core\Exceptions\ValidationError;

class MotorCreateDTO {
    // Constructor Property Promotion e propriedades readonly para imutabilidade
    private function __construct(
        public readonly string $nome,
        public readonly string $descricao,
        public readonly string $urlApi,
        public readonly bool $producao
    ) {}

    public static function fromArray(array $data): self {
        $errors = [];

        // Validação manual e estrita
        if (empty($data['nome']) || strlen($data['nome']) > 255) {
            $errors['nome'] = "O campo nome é obrigatório e deve ter menos que 255 caracteres.";
        }

        if (empty($data['url_api']) || !filter_var($data['url_api'], FILTER_VALIDATE_URL)) {
            $errors['url_api'] = "O campo url_api deve ser uma URL válida.";
        }

        // Lança exceção de validação contendo os campos incorretos
        if (!empty($errors)) {
            throw new ValidationError("Dados de entrada inválidos", $errors);
        }

        return new self(
            (string) $data['nome'],
            (string) ($data['descricao'] ?? ''),
            (string) $data['url_api'],
            (bool) ($data['producao'] ?? false)
        );
    }
}
```

---

### 5.5 Camada de Negócio: Services
A classe de serviço gerencia as decisões de negócio e manipula os fluxos de rede. Em PHP, use dependências via construtor para facilitar testes mockados futuramente.

```php
<?php
// src/Modules/AnaliseMl/Services/AnaliseMlService.php
declare(strict_types=1);

namespace App\Modules\AnaliseMl\Services;

use App\Modules\AnaliseMl\DTOs\MotorCreateDTO;
use App\Modules\AnaliseMl\Repositories\AnaliseMlRepository;
use App\Core\Exceptions\ConflictException;
use App\Core\Logger;

class AnaliseMlService {
    private AnaliseMlRepository $repository;

    public function __construct() {
        $this->repository = new AnaliseMlRepository();
    }

    public function createMotor(MotorCreateDTO $dto): array {
        $logger = Logger::getLogger();
        
        // Verifica se o motor já existe
        $existente = $this->repository->findByNome($dto->nome);
        if ($existente !== null) {
            $logger->warning("Tentativa de criação de motor duplicado", ['nome' => $dto->nome]);
            throw new ConflictException("Já existe um motor com o nome informado");
        }

        // Persistência
        $motor = $this->repository->create($dto);
        
        $logger->info("Motor cadastrado com sucesso no banco de dados", ['id' => $motor['id']]);
        return $motor;
    }
}
```

---

### 5.6 Camada de Acesso a Dados: Repositories (PDO e Anti-SQL Injection)
No PHP puro, usamos **PDO (PHP Data Objects)**. É terminantemente obrigatório o uso de **Prepared Statements** com placeholders para bloquear vulnerabilidades de injeção de SQL.

```php
<?php
// src/Modules/AnaliseMl/Repositories/AnaliseMlRepository.php
declare(strict_types=1);

namespace App\Modules\AnaliseMl\Repositories;

use App\Core\Database;
use App\Core\Exceptions\DatabaseException;
use App\Modules\AnaliseMl\DTOs\MotorCreateDTO;
use PDO;
use Exception;

class AnaliseMlRepository {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function findByNome(string $nome): ?array {
        try {
            $stmt = $this->db->prepare("SELECT * FROM ml_motor WHERE nome = :nome LIMIT 1");
            $stmt->execute(['nome' => $nome]);
            $result = $stmt->fetch();
            
            return $result ? $result : null;
        } catch (Exception $e) {
            throw new DatabaseException("Erro ao buscar motor por nome no banco", 0, $e);
        }
    }

    public function create(MotorCreateDTO $dto): array {
        try {
            $this->db->beginTransaction();

            // Se for produção, desativa outros motores ativos primeiro
            if ($dto->producao) {
                $this->db->exec("UPDATE ml_motor SET producao = 0 WHERE producao = 1");
            }

            $stmt = $this->db->prepare("
                INSERT INTO ml_motor (nome, descricao, url_api, producao, created_at, updated_at)
                VALUES (:nome, :descricao, :url_api, :producao, NOW(), NOW())
            ");
            
            $stmt->execute([
                'nome' => $dto->nome,
                'descricao' => $dto->descricao,
                'url_api' => $dto->urlApi,
                'producao' => $dto->producao ? 1 : 0
            ]);

            $id = $this->db->lastInsertId();
            $this->db->commit();

            return [
                'id' => (int) $id,
                'nome' => $dto->nome,
                'descricao' => $dto->descricao,
                'url_api' => $dto->urlApi,
                'producao' => $dto->producao
            ];
        } catch (Exception $e) {
            $this->db->rollBack();
            throw new DatabaseException("Erro ao criar motor de análise no banco", 500, $e);
        }
    }
}
```

---

### 5.7 Formatador de Resposta JSON (`src/Core/Response.php`)
Métodos para centralizar a saída HTTP com o mesmo layout de resposta de Node.js e Python:

```php
<?php
// src/Core/Response.php
declare(strict_types=1);

namespace App\Core;

class Response {
    public static function success(mixed $data, string $message = "Operação realizada com sucesso", int $statusCode = 200): void {
        http_response_code($statusCode);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ]);
        exit;
    }

    public static function created(mixed $data, string $message = "Recurso criado com sucesso"): void {
        self::success($data, $message, 201);
    }

    public static function error(string $message, int $statusCode = 500, mixed $details = null): void {
        http_response_code($statusCode);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'error' => [
                'code' => $statusCode,
                'details' => $details
            ],
            'timestamp' => date('c')
        ]);
        exit;
    }
}
```

---

## 6. Gerenciamento de Conexões e Banco de Dados (Database Manager)

A classe `Database` gerencia a instância do PDO centralmente no padrão **Singleton**, aplicando configurações de performance essenciais para bancos PostgreSQL/MySQL em produção:

```php
<?php
// src/Core/Database.php
declare(strict_types=1);

namespace App\Core;

use PDO;
use Exception;

class Database {
    private static ?PDO $connection = null;

    public static function getConnection(): PDO {
        if (self::$connection === null) {
            try {
                $host = $_ENV['DB_HOST'] ?? 'localhost';
                $port = $_ENV['DB_PORT'] ?? '5432';
                $dbname = $_ENV['DB_DATABASE'] ?? 'sij';
                $username = $_ENV['DB_USERNAME'] ?? 'postgres';
                $password = $_ENV['DB_PASSWORD'] ?? '';

                $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
                
                self::$connection = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Levanta exceções em caso de erros SQL
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // Respostas retornam como arrays associativos chave-valor
                    PDO::ATTR_PERSISTENT => true, // Habilita conexões persistentes para performance (pooling nativo)
                    PDO::ATTR_EMULATE_PREPARES => false // Garante prepared statements nativos reais do SGBD
                ]);
            } catch (Exception $e) {
                throw new Exception("Falha na inicialização do pool de conexões PDO: " . $e->getMessage());
            }
        }

        return self::$connection;
    }
}
```

---

## 7. Boas Práticas e Checklist para Code Review

- [ ] Todo arquivo PHP começa com `declare(strict_types=1);` no topo, sem espaçamento superior.
- [ ] Nenhum arquivo PHP utiliza a tag de fechamento `?>` no final do arquivo (boas práticas para evitar espaçamentos involuntários de buffer).
- [ ] Não existem chamadas diretas a `require` ou `include` para instanciar classes de domínio; tudo é resolvido com `use` e Composer.
- [ ] Todas as chamadas de banco de dados usam PDO Prepared Statements com atribuição via placeholders.
- [ ] A pasta do recurso segue o modelo modular encapsulando suas rotas locais em `Routes.php`.
- [ ] Logs informativos são escritos no `Monolog` (`Logger::getLogger()->info()`) em catches de erros, omitindo variáveis do tipo password ou segredos de chaves de API.
