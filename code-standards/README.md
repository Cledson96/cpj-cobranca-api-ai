# Guia de Desenvolvimento — TR Padrão

Este repositório centraliza as diretrizes de desenvolvimento, padrões de código, convenções de nomenclatura e definições arquiteturais para os projetos da **TR Padrão** (Juscash).

O objetivo é garantir a consistência do código, a escalabilidade da arquitetura e a facilidade de manutenção em todas as tecnologias utilizadas na organização.

## Tecnologias Disponíveis

Abaixo estão listadas as tecnologias suportadas com seus respectivos guias de padronização:

| Tecnologia | Descrição | Status | Guia de Referência |
| :--- | :--- | :--- | :--- |
| **Node.js com TypeScript** | Arquitetura modular em camadas, Express 5, Prisma ORM, Redis e BullMQ. | 🟢 Ativo | [Node.js + TypeScript](file:///c:/trabalho/padrao/node-typescript.md) |
| **Python** | Arquitetura modular adaptada, FastAPI, Pydantic, SQLAlchemy e UV. | 🟢 Ativo | [Python](file:///c:/trabalho/padrao/python.md) |
| **PHP Puro (Moderno)** | Front Controller Pattern, PSR-4 Autoloading, PDO Seguro e DTOs de Validação. | 🟢 Ativo | [PHP Puro](file:///c:/trabalho/padrao/php.md) |
| **Outras Tecnologias** | Guias futuros (ex: React, Flutter). | 🟡 Em breve | *N/A* |

---

## Como Utilizar estes Guias

1. **Novos Projetos**: Utilize o guia da tecnologia correspondente como template de inicialização e estruturação.
2. **Revisão de Código (Code Review)**: Use os checklists presentes em cada guia para avaliar os Pull Requests de forma objetiva.
3. **Suporte de IA**: Os arquivos de regras também servem de base para configurar assistentes de IA (como `.cursorrules` ou arquivos `.mdc`) para que gerem códigos aderentes aos padrões corporativos.

---

> [!NOTE]  
> Este guia é um documento vivo. Caso identifique a necessidade de novas regras ou ajustes nas práticas existentes, sinta-se à vontade para propor alterações via Pull Request.
