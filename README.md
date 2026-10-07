# LegacyAI

Plataforma web de apoio ao diagnóstico técnico de sistemas legados.

## Sobre o projeto

O usuário envia material textual ou código-fonte de um projeto, escolhe um provider de IA configurado e recebe uma análise técnica estruturada. O relatório apoia a revisão humana; não a substitui.

## Funcionalidades do MVP

- Cadastro, login, autenticação JWT e acesso restrito aos próprios dados.
- Criação, listagem, consulta e exclusão de projetos na interface (a API também oferece atualização); upload de material ao criar o projeto ou posteriormente.
- Seleção de provider disponível, análise assíncrona e acompanhamento de `PENDING`, `PROCESSING`, `COMPLETED` ou `FAILED`.
- Relatório persistido, histórico de análises, reabertura e Dashboard com análises recentes.
- Validação de upload, bloqueio de análise sem arquivo e mensagens de erro públicas tratadas.

## Providers de IA

OpenAI, Anthropic Claude e DeepSeek possuem adaptadores no backend. A disponibilidade de cada um depende da respectiva chave configurada no processo do backend; o endpoint de providers indica quais estão disponíveis. `AUTO` é aceito na criação de análise e usa OpenAI como padrão, sem seleção inteligente entre providers.

## Estrutura do relatório

O resultado tem sete seções: resumo, tecnologias, arquitetura, problemas, riscos de segurança, recomendações e modernização. Problemas, riscos e recomendações podem ter prioridade `HIGH` (alta), `MEDIUM` (média) ou `LOW` (baixa); listas vazias são válidas quando o material não sustenta achados.

## Tecnologias e arquitetura

- Backend: Java 21, Spring Boot 3.5.0, Spring Web, Security, Data JPA, Validation, Flyway e Maven.
- Frontend: React 19, TypeScript 6, Vite 8, React Router DOM 7 e Axios; lint com Oxlint. O roteamento usa APIs declarativas compatíveis com a estrutura atual.
- Persistência: PostgreSQL 16 (imagem `postgres:16-alpine` no Compose).

`Frontend → API REST Spring Boot → PostgreSQL → provider de IA selecionado`. O backend é um monólito modular. A criação da análise persiste `PENDING` e responde HTTP 202; o processamento é disparado em tarefa assíncrona no próprio processo Java (`CompletableFuture.runAsync`), atualiza o status e persiste o relatório ou `FAILED`. O frontend consulta o status periodicamente. O MVP não usa Redis, RabbitMQ ou fila externa.

## Pré-requisitos

- JDK 21 e Maven (o projeto não inclui Maven Wrapper).
- Node.js compatível com Vite 8: `^20.19.0` ou `>=22.12.0`; npm.
- Docker com Compose para o PostgreSQL local, ou PostgreSQL compatível configurado conforme `backend/src/main/resources/application.properties`.
- Chave de pelo menos um provider para gerar relatórios reais; sem chave, o respectivo provider fica indisponível.

## Configuração e execução local

Na raiz do repositório, crie o arquivo local de variáveis e substitua os placeholders de senha de desenvolvimento e JWT. Use **o mesmo valor** em `POSTGRES_PASSWORD` (Compose) e `SPRING_DATASOURCE_PASSWORD` (Spring/Flyway). O JWT usa bytes UTF-8 e precisa de pelo menos 32 bytes; não use Base64 por exigência da aplicação. Configure somente as chaves de providers que pretende usar. Nunca versione `.env`.

```sh
cp .env.example .env
# Edite .env localmente; não inclua credenciais reais em arquivos versionados.
set -a
. ./.env
set +a
docker compose -f backend/docker-compose.yml up -d postgres
cd backend
mvn spring-boot:run
```

Os comandos acima são executados no **mesmo terminal**: o backend lê variáveis exportadas pelo shell, não carrega `.env` automaticamente. Em IntelliJ, forneça as mesmas variáveis na configuração de execução. O Compose publica PostgreSQL em `localhost:5433`; o backend usa essa porta e atende em `localhost:8080` por padrão. Para banco diferente, ajuste explicitamente as URLs/usuários de datasource e Flyway na configuração do processo; `POSTGRES_URL` e `POSTGRES_USERNAME` não são lidos pelo código atual.

Em outro terminal, a partir da raiz:

```sh
cd frontend
npm ci
npm run dev
```

O Vite expõe o frontend normalmente em `localhost:5173` e encaminha `/api` para `localhost:8080`. Para CORS fora dos endereços locais padrão, configure a propriedade Spring `legacyai.cors.allowed-origins`; o perfil `prod` define `http://localhost:5173` como padrão e deve ser adaptado ao domínio da implantação. O diretório de armazenamento dos uploads é configurado pela propriedade `upload.temp-dir` (padrão `${user.home}/.legacyai/uploads`).

## Testes

```sh
cd backend
mvn test
mvn package -DskipTests

cd ../frontend
node --test tests/*.test.cjs
npx tsc -b
npm run lint
npm run build

cd ..
git diff --check
```

Na baseline homologada `c454191`, passaram 53 testes backend e 23 frontend, além dos builds, typecheck e lint. Essas contagens são da versão homologada e podem mudar com o projeto.

## Fluxo principal

Cadastro/login → projeto → upload de material → provider disponível → análise → acompanhamento do processamento → relatório → histórico e reabertura.

## Limitações conhecidas

- A qualidade e o alcance das conclusões dependem do conteúdo enviado; ausência de informação no material não prova ausência de algo no projeto.
- Respostas de LLM são probabilísticas. Providers podem produzir avaliações diferentes; o contrato compartilhado reduz divergências, mas não elimina inferências incorretas ou omissões. Interprete o resultado como apoio técnico, não como verdade absoluta.
- Upload direto aceita `.zip`, `.md`, `.txt` e `README` sem extensão, sujeitos a validação de MIME e tamanho. ZIPs podem conter arquivos binários ou irrelevantes: aceitação do arquivo não garante texto analisável. Não há extração de texto de PDF; PDF direto não é aceito e PDFs dentro de ZIPs não são transformados em texto.
- Uma análise real depende das APIs externas; indisponibilidade, custo, quotas e limites de uso variam por provider. O processamento assíncrono do MVP usa o processo Java, não uma fila durável externa.

## Status do MVP

Na homologação da baseline, o fluxo autenticado cobriu projeto sem material, upload válido/inválido, análise real OpenAI de `PROCESSING` a `COMPLETED`, relatório de sete seções, persistência/reabertura, Dashboard/histórico, mobile em 375 px, 404 e logout/proteção de rota. Nenhum defeito bloqueador foi reproduzido. A disponibilidade de Claude e DeepSeek foi observada quando configurados; isso não significa que toda execução usou os três providers.

## Documentação adicional

- [Arquitetura](ARCHITECTURE.md) e [escopo](SCOPE.md)
- [Contratos REST](docs/api/contracts.md)
- [Autenticação](docs/features/authentication.md), [upload](docs/features/upload.md), [análise e providers](docs/features/analysis.md) e [relatório](docs/features/report.md)
- [Avaliação experimental de providers](docs/evaluation.md)
