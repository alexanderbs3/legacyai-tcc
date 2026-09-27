# Arquitetura -- LegacyAI

> [spec] Baseado no Documento de Escopo v1.0.
> Para trabalhar em area especifica, parta de `backend/ARCHITECTURE.md` ou `frontend/ARCHITECTURE.md`.

## Visao geral

Monolito modular: backend Spring Boot unico, frontend React separado, comunicacao via REST/JSON,
PostgreSQL como banco de dados. Sem microsservicos, sem mensageria, sem cache externo no MVP.

## Diagrama de componentes

```mermaid
graph TB
    subgraph FE["Frontend  (React + TypeScript + Vite)"]
        Pages["Pages / Components"]
        SVC_FE["Services (Axios)"]
    end

    subgraph BE["Backend  (Spring Boot -- Monolito Modular)"]
        direction TB
        SEC["security (JWT + BCrypt)"]
        CTRL["Controllers"]
        SVC_BE["Services"]
        REPO["Repositories"]
        FILE["file (FileProcessor + ZipProcessor)"]
        PCB["ProjectContextBuilder"]
        AI["ai (AIProvider interface)"]
    end

    subgraph PROV["Provedores de IA  (APIs externas)"]
        OAI[OpenAI]
        CLD[Claude]
        GMN[Gemini]
    end

    DB[(PostgreSQL)]

    FE -->|REST / JSON| CTRL
    CTRL --> SVC_BE
    SVC_BE --> REPO
    REPO --> DB
    SVC_BE --> FILE
    FILE --> PCB
    SVC_BE --> AI
    AI --> OAI & CLD & GMN
```

## Modulos do backend

| Modulo      | Responsabilidade                                        |
|-------------|----------------------------------------------------------|
| `security`  | Autenticacao JWT, autorizacao, BCrypt, filtros           |
| `project`   | CRUD de projetos, verificacao de propriedade             |
| `file`      | Validacao, extracao segura de ZIP, filtro de arquivos    |
| `analysis`  | Orquestracao do fluxo, status, persistencia do relatorio |
| `ai`        | Interface `AIProvider` + estrategias por fornecedor      |
| `shared`    | DTOs, excecoes globais, configuracoes comuns             |

## Modelo de dados

```mermaid
erDiagram
    User ||--o{ Project : "owns"
    Project ||--o{ UploadedFile : "has"
    Project ||--o{ Analysis : "has"
    Analysis ||--o| AnalysisResult : "produces"

    User {
        UUID id PK
        string name
        string email
        string passwordHash
        timestamp createdAt
    }
    Project {
        UUID id PK
        string name
        string description
        UUID userId FK
        timestamp createdAt
        timestamp updatedAt
    }
    UploadedFile {
        UUID id PK
        UUID projectId FK
        string fileName
        string fileType
        long fileSize
        timestamp uploadedAt
    }
    Analysis {
        UUID id PK
        UUID projectId FK
        string provider
        string status
        timestamp createdAt
        timestamp completedAt
        string errorMessage
    }
    AnalysisResult {
        UUID id PK
        UUID analysisId FK
        text summary
        text technologies
        text architecture
        text problems
        text securityRisks
        text recommendations
        text modernization
    }
```

**Analysis.status:** `PENDING` -> `PROCESSING` -> `COMPLETED` | `FAILED`

## Pipeline de analise

```mermaid
sequenceDiagram
    participant U as Usuario
    participant C as Controller
    participant AS as AnalysisService
    participant FP as FileProcessor
    participant PCB as ProjectContextBuilder
    participant AI as AIProvider
    participant DB as PostgreSQL

    U->>C: POST /api/projects/{id}/analyses
    C->>AS: initiateAnalysis(projectId, provider)
    AS->>DB: salvar Analysis (PENDING)
    AS-->>C: 202 Accepted + analysisId
    AS->>FP: processFiles(uploadedFiles)
    FP->>PCB: buildContext(filteredFiles)
    PCB-->>AS: ProjectContext
    AS->>DB: Analysis -> PROCESSING
    AS->>AI: analyze(AIAnalysisRequest)
    AI-->>AS: AIAnalysisResponse (normalizado)
    AS->>DB: AnalysisResult + Analysis -> COMPLETED
```

## Infraestrutura

- **Docker Compose:** somente PostgreSQL no MVP. Backend e frontend executam localmente.
- **Porta PostgreSQL:** 5432 (padrao).
- Detalhes de variaveis de ambiente: `SKILLS.md` -- secao Infraestrutura.

## Seguranca -- visao geral

- Spring Security com filtro JWT stateless.
- BCrypt para hash de senhas.
- Verificacao de propriedade em todos os services.
- Chaves de IA exclusivamente em variaveis de ambiente.

-> Detalhes: `docs/features/authentication.md`
-> Contrato REST completo: `docs/api/contracts.md`
