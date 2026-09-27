# Arquitetura do Backend -- LegacyAI

> [spec] Estrutura baseada no Documento de Escopo v1.0.

## Stack

Java 21 / Spring Boot / Spring Web / Spring Data JPA / Spring Security / Bean Validation (Jakarta) / Maven / PostgreSQL

## Estrutura de pacotes

```
src/main/java/com/legacyai/
├── config/                      # Beans Spring, CORS, configuracoes de seguranca
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
│   └── gemini/                  # GeminiProvider
├── file/
│   ├── FileProcessor.java       # Ponto de entrada para processamento
│   └── ZipProcessor.java        # Extracao segura de ZIP (Zip Slip protection)
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
| `UploadedFile`  | id, projectId, fileName, fileType, fileSize, uploadedAt                      |
| `Analysis`      | id, projectId, provider (enum), status (enum), createdAt, completedAt, errorMessage |
| `AnalysisResult`| id, analysisId, summary, technologies, architecture, problems, securityRisks, recommendations, modernization |

**Analysis.status (enum):** `PENDING` -> `PROCESSING` -> `COMPLETED` | `FAILED`

Campos compostos de `AnalysisResult` sao armazenados como `TEXT` ou JSON no MVP.

## Interface AIProvider

```java
public interface AIProvider {
    AIAnalysisResponse analyze(AIAnalysisRequest request);
    String getProviderName();   // "OPENAI" | "CLAUDE" | "GEMINI"
    boolean isAvailable();      // false se chave de ambiente nao configurada
}
```

- `AnalysisService` seleciona o provedor por nome ou usa o padrao quando `AUTO`.
- Resposta sempre normalizada para `AIAnalysisResponse` dentro da estrategia -- nunca no service.

## Seguranca

- **JWT stateless:** filtro le `Authorization: Bearer <token>` e popula `SecurityContextHolder`.
- **BCrypt** para hash de senhas -- nunca armazenar senha em claro.
- **Rotas publicas:** `/api/auth/register`, `/api/auth/login`.
- **Ownership:** verificado no service -- nunca confiar apenas no ID da URL.
- **Sem exposicao interna:** `@ControllerAdvice` captura todas as excecoes; retorna JSON sem stacktrace.

## Configuracao e ambiente

- `application.properties`: configuracoes sem segredos.
- `.env` (local, nao versionado): valores reais.
- `.env.example` (versionado): template com chaves, sem valores.
