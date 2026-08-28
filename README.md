# Triconta

Aplicação de divisão de despesas em grupo para rede interna, estilo Tricount.

## Requisitos

- Docker
- Docker Compose

## Como rodar

```bash
# Clone o repositório
git clone <repo-url>
cd Triconta

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env se necessário

# Suba os containers
docker compose up --build -d

# Acesse no browser
http://localhost
```

## Parar a aplicação

```bash
docker compose down
```

## Resetar banco de dados

```bash
docker compose down -v
docker compose up --build -d
```

## Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Node.js 20 + Fastify + TypeScript + Drizzle ORM
- **Banco**: PostgreSQL 16
- **Proxy**: Nginx
