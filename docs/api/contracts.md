# Contratos REST -- LegacyAI

> Conferido com controllers, DTOs e services da baseline `c454191`.

Este documento e a **ponte entre frontend e backend**.
Um agente de frontend pode trabalhar em telas sem ler o codigo do backend, e vice-versa.

**Base URL:** `/api`
**Autenticação:** JWT no header Bearer em todas as rotas, exceto `/api/auth/**`.
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

Erros: 400 (validação ou e-mail duplicado)
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

Erros: 401 (credenciais inválidas), 429 (limite de 5 tentativas por IP em 5 minutos; `Retry-After: 300`)
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

`name` é obrigatório, normalizado exclusivamente pela remoção do espaço ASCII U+0020 nas
extremidades e pela redução de sequências internas de U+0020 para um único U+0020. Tabs,
quebras de linha, outros controles e outros espaços Unicode (como NBSP) não são removidos
e tornam o nome inválido. Após a normalização, o nome deve ter entre 3 e 150 unidades
UTF-16, conter ao menos uma letra Unicode e aceitar somente letras Unicode, números e o
espaço ASCII U+0020. `description` é limitada a 2000 unidades UTF-16; valor ausente ou
composto somente por espaços é persistido como string vazia. A mesma regra de `name` vale
para `POST` e `PUT`.

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

O `PUT` substitui os dois campos. Se `description` for omitida ou `null`, o valor
persistido passa a ser uma string vazia; a operação não possui semântica de PATCH.

### DELETE /api/projects/{id}

```
Response 204 No Content
Erros: 403, 404, 500 `STORAGE_ERROR` quando os uploads não podem ser movidos
com segurança para a quarentena transacional. A resposta usa mensagem genérica
e o projeto permanece disponível. Os bytes só são removidos definitivamente
após o commit; em rollback, voltam ao caminho original.
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

### GET /api/projects/{id}/files
```
Response 200: UploadedFileResponse[] (id, fileName, fileType, fileSize, uploadedAt)
Erros: 403 (projeto de outro usuario), 404
```

### POST /api/projects/{id}/files

```
Content-Type: multipart/form-data
Campo: file
Extensoes aceitas: .zip / .md / .txt / README (sem extensao)
Tamanho maximo: 70 MB por arquivo; 75 MB por requisicao multipart (inclui overhead do formulario)
Quota total: 350 MB por usuário, configurável por `upload.max-total-size-per-user`

Response 201:
{
  "id": "uuid",
  "fileName": "string",
  "fileType": "string",
  "fileSize": 12345,
  "uploadedAt": "ISO-8601"
}

Erros: 400 `INVALID_FILE` (extensão/MIME inválidos, quota total por usuário ou limite verificado no service),
400 `FILE_TOO_LARGE` (limite multipart), 403 (projeto de outro usuário), 404 (projeto ausente)
```

---

## Analise

### POST /api/projects/{id}/analyses

```
Request:
{
  "provider": "OPENAI | CLAUDE | DEEPSEEK | AUTO"
}

Response 202 Accepted:
{
  "analysisId": "uuid",
  "status": "PENDING"
}

Erros: 400 `INVALID_FILE` quando o projeto não possui arquivo (nenhuma análise é criada)
ou para provider desconhecido; 403, 404. Provider reconhecido sem chave pode levar a
`FAILED` depois do HTTP 202.
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
  "projectId": "uuid",
  "provider": "string",
  "status": "COMPLETED",
  "createdAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "errorMessage": null,
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

Status possíveis: `PENDING`, `PROCESSING`, `COMPLETED` e `FAILED`.
`result` é `null` antes de `COMPLETED` e em `FAILED`; `completedAt` é `null`
enquanto não terminar. Em `FAILED`, `errorMessage` contém mensagem pública
classificada ou genérica. `projectId` permite retornar ao projeto de origem.
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
  { "name": "OPENAI",   "displayName": "OPENAI",   "available": true  },
  { "name": "CLAUDE",   "displayName": "CLAUDE",   "available": true  },
  { "name": "DEEPSEEK", "displayName": "DEEPSEEK", "available": false }
]
```

Os booleanos do exemplo são ilustrativos: `available` depende de chave não vazia
no processo; não verifica validade, créditos nem conectividade antecipadamente.
`AUTO` e aceito em `POST /api/projects/{id}/analyses` e seleciona `OPENAI`, mas nao e listado nesta resposta.
O frontend exibe `DEEPSEEK` como "DeepSeek V4.1 Flash"; a configuracao usa o identificador de modelo `deepseek-flash`.

---

## Codigos de erro padrao

| Codigo | Situacao                                           |
|--------|----------------------------------------------------|
| 400    | Requisicao invalida (validacao, arquivo invalido)  |
| 401    | Token ausente ou expirado                          |
| 403    | Recurso pertence a outro usuario                   |
| 404    | Recurso nao encontrado                             |
| 429    | Limite de tentativas de login por IP               |
| 500    | Erro interno                                       |

**Envelope de erro** de exceções mapeadas por `ApiExceptionHandler`:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Descrição legível sem detalhes internos"
}
```

Os erros 401/403 emitidos diretamente pelo Spring Security e os erros inesperados
não devem ser presumidos como tendo o mesmo envelope. `INVALID_FILE` cobre também
projeto sem arquivo; upload fora do limite multipart retorna `FILE_TOO_LARGE`.

---

## Paginação

As listagens deste MVP não implementam paginação: retornam os itens acessíveis ao usuário autenticado.
