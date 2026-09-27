# Arquitetura do Frontend -- LegacyAI

> [spec] Estrutura baseada no Documento de Escopo v1.0.

## Stack

React / TypeScript / Vite / React Router v6 / Axios
Sem Redux no MVP -- estado local com hooks.

## Estrutura de diretorios

```
frontend/src/
├── components/          # Componentes reutilizaveis (Button, Card, StatusBadge, ProviderSelector...)
├── pages/               # Um arquivo por pagina da aplicacao
├── services/            # Funcoes de chamada a API
│   └── api.ts           # Instancia Axios com interceptors de auth e erro
├── hooks/               # Custom hooks (useAuth, useProject, useAnalysisPolling...)
├── types/               # Interfaces TypeScript correspondendo aos DTOs da API
├── utils/               # Funcoes utilitarias puras (formatacao de data, prioridade...)
├── routes/              # Definicao de rotas e ProtectedRoute
└── App.tsx              # Raiz: provedor de rotas
```

## Fluxo de autenticacao

```
POST /api/auth/login -> token JWT -> armazenar -> redirect /dashboard
POST /api/auth/register -> redirect /login
Rota protegida sem token -> redirect /login
Logout -> limpar token -> redirect /login
```

## Integracao com API

- **Base URL:** `/api` (proxy Vite em dev -- verificar `vite.config.ts` [spec]).
- **Token:** injetado via interceptor em toda requisicao autenticada.
- **Tipos:** definir interfaces em `src/types/` para cada DTO de resposta.
- **Contrato completo de endpoints:** `../docs/api/contracts.md`.

## Interfaces TypeScript esperadas [spec]

```typescript
// src/types/index.ts
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface AnalysisSummary {
  id: string;
  provider: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface AnalysisDetail extends AnalysisSummary {
  result: AnalysisResult | null;
}

interface AnalysisResult {
  summary: string;
  technologies: string[];
  architecture: string;
  problems: Issue[];
  securityRisks: Issue[];
  recommendations: Issue[];
  modernization: string[];
}

interface Issue {
  title: string;
  description: string;
  priority: Priority;
}

type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
```

## Responsividade

Interface simples e demonstravel para o TCC. Responsividade basica e suficiente.
Nao e necessario design system elaborado ou animacoes.
