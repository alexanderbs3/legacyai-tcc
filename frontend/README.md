# Frontend do LegacyAI

Aplicação React, TypeScript e Vite do MVP. Para pré-requisitos, configuração do backend/PostgreSQL, fluxo do produto e limitações, consulte o [README principal](../README.md).

Com o backend acessível em `localhost:8080`, execute neste diretório:

```sh
npm ci
npm run dev
```

O Vite encaminha `/api` para o backend. Para validar o frontend:

```sh
node --test tests/*.test.cjs
npx tsc -b
npm run lint
npm run build
```