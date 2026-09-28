# Contratos REST -- LegacyAI

> [spec] Baseado no Documento de Escopo v1.0. Verificar implementacao real antes de alterar.

Este documento e a **ponte entre frontend e backend**.
Um agente de frontend pode trabalhar em telas sem ler o codigo do backend, e vice-versa.

**Base URL:** `/api`
**Autenticacao:** `Authorization: Bearer <JWT>` em todas as rotas, exceto `/api/auth/**`.
**Content-Type:** `application/json` (exceto upload: `multipart/form-data`).

---

## Autenticacao

### POST /api/auth/register

```
Request:
{
  "name": "string",
  "email": "string",
  "password": "string"
}

Response 201:
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "createdAt": "ISO-8601"
}

Erros: 400 (validacao)
```

### POST /api/auth/login

```
Request:
{
  "email": "string",
  "password": "string"
}

Response 200:
{
  "token": "string (JWT)",
  "type": "Bearer"
}

Erros: 401 (credenciais invalidas)
```

---

## Projetos

Todas as rotas de projeto retornam apenas recursos do usuario autenticado.

### GET /api/projects

```
Response 200: ProjectResponse[]
```

### POST /api/projects

```
Request:  { "name": "string", "description": "string (opcional)" }
Response 201: ProjectResponse
Erros: 400 (validacao)
```

### GET /api/projects/{id}

```
Response 200: ProjectResponse
Erros: 403 (nao e dono), 404
```

### PUT /api/projects/{id}

```
Request:  { "name": "string", "description": "string" }
Response 200: ProjectResponse
Erros: 400, 403, 404
```

### DELETE /api/projects/{id}

```
Response 204 No Content
Erros: 403, 404
```

**ProjectResponse:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

## Upload de Arquivos

### POST /api/projects/{id}/files

```
Content-Type: multipart/form-data
Campo: file
Extensoes aceitas: .zip / .md / .txt / README (sem extensao)
Tamanho maximo: 70 MB por arquivo; 75 MB por requisicao multipart (inclui overhead do formulario)

Response 201:
{
  "id": "uuid",
  "fileName": "string",
  "fileType": "string",
  "fileSize": 12345,
  "uploadedAt": "ISO-8601"
}

Erros: 400 (arquivo invalido ou limite excedido, com `FILE_TOO_LARGE`), 403 (projeto de outro usuario)
```

---

## Analise

### POST /api/projects/{id}/analyses

```
Request:
{
  "provider": "OPENAI | CLAUDE | GEMINI | AUTO"
}

Response 202 Accepted:
{
  "analysisId": "uuid",
  "status": "PENDING"
}

Erros: 403, 404
```

### GET /api/projects/{id}/analyses

```
Response 200: AnalysisSummary[]
[
  {
    "id": "uuid",
    "provider": "OPENAI",
    "status": "PENDING | PROCESSING | COMPLETED | FAILED",
    "createdAt": "ISO-8601",
    "completedAt": "ISO-8601 | null",
    "errorMessage": "string | null"
  }
]
```

### GET /api/analyses/{id}

```
Response 200: AnalysisDetail
{
  "id": "uuid",
  "provider": "string",
  "status": "COMPLETED",
  "createdAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "result": {
    "summary": "string",
    "technologies": ["Java 8", "Spring MVC"],
    "architecture": "string",
    "problems": [
      { "title": "string", "description": "string", "priority": "HIGH | MEDIUM | LOW" }
    ],
    "securityRisks": [
      { "title": "string", "description": "string", "priority": "MEDIUM" }
    ],
    "recommendations": [
      { "title": "string", "description": "string", "priority": "HIGH" }
    ],
    "modernization": ["string"]
  }
}

Nota: result e null quando status != COMPLETED
Erros: 403, 404
```

### DELETE /api/analyses/{id}

```
Response 204 No Content
Erros: 403 (analise de outro usuario), 404
```

---

## Provedores de IA

### GET /api/ai/providers

```
Response 200:
[
  { "name": "OPENAI",  "displayName": "ChatGPT",   "available": true  },
  { "name": "CLAUDE",  "displayName": "Claude",     "available": true  },
  { "name": "GEMINI",  "displayName": "Gemini",     "available": false },
  { "name": "AUTO",    "displayName": "Automatico", "available": true  }
]
```

`available: false` quando a variavel de ambiente da chave nao estiver configurada.

---

## Codigos de erro padrao

| Codigo | Situacao                                           |
|--------|----------------------------------------------------|
| 400    | Requisicao invalida (validacao, arquivo invalido)  |
| 401    | Token ausente ou expirado                          |
| 403    | Recurso pertence a outro usuario                   |
| 404    | Recurso nao encontrado                             |
| 500    | Erro interno (sem detalhes expostos)               |

**Envelope de erro:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Descricao legivel sem detalhes internos"
}
```

---

## Paginacao

[spec] Paginacao nao definida no Escopo v1.0. Listas retornam todos os itens do usuario autenticado.
