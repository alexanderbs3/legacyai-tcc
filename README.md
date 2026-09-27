# LegacyAI

LegacyAI é uma plataforma web para diagnóstico técnico de sistemas legados: o usuário cria um projeto, envia código-fonte compactado ou documentação e recebe um relatório padronizado gerado por um provedor de IA configurado, incluindo riscos, problemas, recomendações e ações de modernização.

## Pré-requisitos

- Java 21
- Maven 3.9+
- Node.js 20+
- Docker com Docker Compose

## Configuração

Clone o repositório e crie seu arquivo local de ambiente:

    git clone <URL_DO_REPOSITORIO>
    cd legacy-ai
    cp .env.example .env

Preencha `.env` com `JWT_SECRET` (ao menos 32 caracteres), `SPRING_DATASOURCE_PASSWORD` e as chaves dos provedores que deseja habilitar. Não versione esse arquivo.

Para o PostgreSQL local iniciado pelo Compose, use:

    POSTGRES_URL=jdbc:postgresql://localhost:5433/legacyai
    POSTGRES_USERNAME=legacyai
    POSTGRES_PASSWORD=legacyai

## Executar localmente

Inicie o banco:

    set -a
    . ./.env
    set +a
    docker compose -f backend/docker-compose.yml up -d postgres

Inicie o backend:

    cd backend
    mvn spring-boot:run

Em outro terminal, inicie o frontend:

    cd frontend
    npm install
    npm run dev

O frontend é servido pelo Vite; o backend usa a porta `8080` por padrão.

## Verificação

    cd backend && mvn test && mvn package -DskipTests
    cd ../frontend && npm run build

Consulte `docs/evaluation.md` para o protocolo e os resultados da avaliação experimental.
