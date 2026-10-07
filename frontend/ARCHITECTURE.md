# Arquitetura do Frontend -- LegacyAI

> Rotas e estrutura conferidas com a implementação atual.

## Stack

React 19 / TypeScript 6 / Vite 8 / React Router DOM v7 / Axios
O roteamento usa as APIs declarativas `<Routes>` e `<Route>`, compatíveis com a estrutura atual.
Sem Redux no MVP -- estado local com hooks.

## Estrutura de diretorios

```
frontend/src/
├── components/          # AppShell, Badge, Button, Card, EmptyState, Input...
├── pages/               # Um arquivo por pagina da aplicacao
├── services/            # Funcoes de chamada a API
│   └── api.ts           # Instancia Axios com interceptors de auth e erro
├── types/               # Interfaces TypeScript correspondendo aos DTOs da API
├── routes/              # ProtectedRoute (guarda de rotas)
└── App.tsx              # Declaração das rotas
```

## Fluxo de autenticacao

```
POST /api/auth/login -> token JWT -> armazenar -> redirect /dashboard
POST /api/auth/register -> redirect /login
Rota protegida sem token -> redirect /login
Logout -> limpar token -> redirect /login
```

## Integracao com API

- **Base URL:** `/api` (proxy Vite em `vite.config.ts` para `localhost:8080`).
- **Token:** injetado via interceptor em toda requisicao autenticada.
- **Tipos:** definir interfaces em `src/types/` para cada DTO de resposta.
- **Polling:** o GET de status usa timeout de 10 segundos e trata timeout como falha transitoria no limite de tres tentativas consecutivas; uploads nao herdam esse timeout curto.
- **Contrato completo de endpoints:** `../docs/api/contracts.md`.

## Tipos da API

`src/types/project.ts` define projeto/arquivo; `src/types/auth.ts` define autenticação;
`src/types/analysis.ts` define `Analysis` (inclui `projectId`, status, `errorMessage`
e `result`), `AnalysisSummary`, `ReportResult` e `ReportItem` com prioridades
`HIGH`, `MEDIUM`, `LOW`. O resultado pode ser `null` enquanto a análise não
terminou ou quando está em `FAILED`.

## Responsividade

Rotas protegidas incluem Dashboard, projetos, análises e histórico; existe fallback 404.
O Dashboard, o menu e o relatório foram homologados em viewport de 375 px.
