# Frontend -- Instrucoes para Agentes

> Contexto global e mapa de documentacao: `../AGENTS.md`
> Contrato de endpoints (DTOs, status codes, campos): `../docs/api/contracts.md`

## Inicio rapido

1. Identifique a pagina ou componente afetado (mapa abaixo).
2. Localize em `src/pages/` ou `src/components/`.
3. Se a tarefa envolve chamada de API, consulte `../docs/api/contracts.md` -- nao adivinhe endpoints ou campos.
4. Para features especificas: `../docs/features/<feature>.md`.

## Mapa de paginas

| Pagina              | Rota                              | Responsabilidade                          |
|---------------------|-----------------------------------|-------------------------------------------|
| Login / Cadastro    | `/login`, `/register`             | Autenticacao, armazenar token             |
| Dashboard           | `/dashboard`                      | Listar projetos, analises recentes        |
| Projeto             | `/projects/:id`                   | Detalhes, arquivos enviados, historico    |
| Novo projeto        | `/projects/new`                   | Formulario + upload de arquivo            |
| Nova analise        | `/projects/:id/analyses/new`      | Selecao de provedor                       |
| Processamento       | `/analyses/:id/processing`        | Polling de status, feedback visual        |
| Resultado           | `/analyses/:id`                   | Relatorio por secoes e prioridades        |
| Historico           | `/history`                        | Data, projeto, provedor, status e link    |

> Rotas conferidas em `src/App.tsx` da baseline `c454191`.

## Padroes obrigatorios

| Regra              | Detalhe                                                                          |
|--------------------|----------------------------------------------------------------------------------|
| Axios centralizado | Usar `src/services/api.ts` -- nao importar Axios diretamente nos componentes     |
| Tipos TypeScript   | Interfaces de resposta da API em `src/types/`                                    |
| Rotas protegidas   | `ProtectedRoute` verifica token; redireciona para `/login` se ausente            |
| Estado             | Hooks locais (`useState`, `useEffect`); sem Redux no MVP                         |
| Erros HTTP         | `401` -> logout + redirect; `403` -> acesso negado; `500` -> mensagem generica   |
| Loading            | Feedback visual em todas as operacoes assincronas (upload, analise)              |

## Servico Axios -- estrutura esperada

```typescript
// src/services/api.ts
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) handleLogout();
    return Promise.reject(err);
  }
);
```

## Polling de status de analise

Pagina de Processamento faz `GET /api/analyses/{id}` em intervalos ate status `COMPLETED` ou `FAILED`.
Intervalo atual: 3 segundos (`src/pages/ProcessingPage.tsx`).
Parar o polling quando status final for atingido ou componente for desmontado (cleanup no `useEffect`).

## Nao fazer

- Nao usar Redux, Zustand ou outra lib de estado global no MVP.
- Nao chamar Axios diretamente nos componentes -- usar `src/services/`.
- Nao presumir endpoints ou campos de resposta -- consultar `../docs/api/contracts.md`.
- Nao armazenar chaves de API no frontend.
