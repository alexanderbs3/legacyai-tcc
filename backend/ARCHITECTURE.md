# Arquitetura do Backend -- LegacyAI

> Implementação atual do backend; o código executável é a fonte de verdade.

## Stack

Java 21 / Spring Boot 3.5.0 / Spring Web / Spring Data JPA / Spring Security / Bean Validation (Jakarta) / Maven / Flyway / PostgreSQL 16

## Estrutura de pacotes

```
src/main/java/com/legacyai/
├── config/                      # SecurityConfig: Spring Security e CORS
├── controller/                  # REST controllers (um por recurso)
├── dto/                         # Request DTOs e Response DTOs
├── entity/                      # Entidades JPA
├── exception/                   # Excecoes customizadas + @ControllerAdvice global
├── repository/                  # JpaRepositories (interfaces)
├── security/                    # Filtro JWT, UserDetailsService, configuracao BCrypt
├── service/                     # Logica de negocio
├── ai/
│   ├── AIProvider.java          # Interface principal
│   ├── AIAnalysisRequest.java   # Entrada da abstracao (contexto do projeto)
│   ├── AIAnalysisResponse.java  # Saida normalizada
│   ├── openai/                  # OpenAIProvider
│   ├── claude/                  # ClaudeProvider
│   └── deepseek/                # DeepSeekProvider
├── file/
│   ├── FileService.java         # Validacao do upload, armazenamento e metadados
│   ├── FileProcessor.java       # Leitura do material para analise
│   └── ZipProcessor.java        # Extracao segura de ZIP (Zip Slip)
├── analysis/
│   ├── AnalysisService.java     # Orquestracao da analise e atualizacao de status
│   └── ProjectContextBuilder.java  # Monta o contexto enviado a IA
└── project/
    └── ProjectService.java      # CRUD e verificacao de ownership de projetos
```

## Entidades

| Entidade        | Campos principais                                                             |
|-----------------|-------------------------------------------------------------------------------|
| `User`          | id (UUID), name, email, passwordHash, createdAt                               |
| `Project`       | id, name, description, userId, createdAt, updatedAt                          |
| `UploadedFile`  | id, projectId, fileName, fileType, fileSize, temporaryPath, uploadedAt       |
| `Analysis`      | id, projectId, provider (String), status (enum), createdAt, completedAt, errorMessage |
| `AnalysisResult`| id, analysisId, summary, technologies, architecture, problems, securityRisks, recommendations, modernization |

**Analysis.status (enum):** `PENDING` → `PROCESSING` → `COMPLETED` ou `FAILED`.

Campos compostos de `AnalysisResult` são armazenados em colunas `TEXT`, com listas serializadas em JSON.

## Interface AIProvider

```java
public interface AIProvider {
    AIAnalysisResponse analyze(AIAnalysisRequest request);
    String getProviderName();   // "OPENAI" | "CLAUDE" | "DEEPSEEK"
    boolean isAvailable();      // false se chave de ambiente nao configurada
}
```

- `AnalysisService` seleciona o provider por nome ou usa `OPENAI` quando o request informa `AUTO` (ou não informa provider).
- Resposta sempre normalizada para `AIAnalysisResponse` dentro da estrategia -- nunca no service.
- `AnalysisInstructions` reúne as instruções semânticas comuns aos três providers.
- A análise sem arquivos é rejeitada antes da criação da entidade. Após o HTTP 202, `CompletableFuture.runAsync` processa os arquivos e atualiza status/resultado no próprio processo Java, sem broker externo.

## Seguranca

- **JWT stateless:** filtro lê o token Bearer e popula `SecurityContextHolder`.
- **BCrypt** para hash de senhas -- nunca armazenar senha em claro.
- **Rotas publicas:** `/api/auth/register`, `/api/auth/login`.
- **Ownership:** verificado no service -- nunca confiar apenas no ID da URL.
- **Erros tratados:** `ApiExceptionHandler` mapeia validação, credenciais, ownership, recurso ausente e upload. O serviço de análise expõe somente mensagens públicas de falha classificadas ou uma mensagem genérica.

## Configuracao e ambiente

- `application.properties`: datasource e Flyway em `localhost:5433`, limite de upload 70 MB/75 MB, `upload.temp-dir`, JWT, modelos e timeouts sem chaves reais. Perfil `prod` define uma origem CORS padrão distinta do fallback de desenvolvimento.
- `backend/docker-compose.yml`: PostgreSQL com porta `5433:5432`; backend/frontend rodam fora do Compose.
- `.env` (local, ignorado): deve ser exportado pelo shell ou configurado no IntelliJ; Spring não o carrega automaticamente. `.env.example` contém apenas placeholders.
- `POSTGRES_PASSWORD` alimenta o Compose; `SPRING_DATASOURCE_PASSWORD` alimenta Spring e Flyway. Devem coincidir no fluxo local. Chaves: `JWT_SECRET` (UTF-8, ao menos 32 bytes), `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` e `DEEPSEEK_API_KEY`.
