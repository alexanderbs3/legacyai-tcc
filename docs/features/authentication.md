# Feature: Autenticacao e Seguranca

> Carregar este arquivo quando trabalhar em: login, cadastro, JWT, Spring Security, ownership ou protecao de rotas.

## Responsabilidade

- Cadastrar e autenticar usuarios.
- Emitir e validar tokens JWT.
- Garantir que cada usuario acesse apenas seus proprios recursos.

---

## Backend

**Pacote:** `com.legacyai.security`
**Endpoints publicos:** `POST /api/auth/register` / `POST /api/auth/login`

### Fluxo de login

```
POST /api/auth/login
  -> validar credenciais
  -> limitar a 5 tentativas por IP a cada 5 minutos
  -> BCrypt.matches(senhaEnviada, hashArmazenado)
  -> gerar JWT com userId e email
  -> retornar { token, type: "Bearer" }
```

### Filtro JWT

- Intercepta todas as requisicoes exceto `/api/auth/**`.
- Extrai token do header `Authorization: Bearer <token>`.
- Valida assinatura e expiracao.
- Popula `SecurityContextHolder` com o usuario autenticado.

### Verificacao de ownership

Em todo service que opera sobre `Project`, `UploadedFile` ou `Analysis`:

```java
if (!resource.getUserId().equals(currentUser.getId())) {
    throw new ForbiddenException("Acesso negado");
}
// Retornar 403 -- nunca 404 quando o recurso existe mas pertence a outro usuario
```

### Regras criticas

- Nunca retornar `passwordHash` em nenhuma resposta da API.
- JWT nao deve expor dados alem de `userId` e `email`.
- Chave de assinatura JWT exclusivamente em variavel de ambiente (`JWT_SECRET`), codificada em Base64 e com pelo menos 32 bytes apos decodificacao.
- Login retorna `429` e `Retry-After: 300` quando o limite de tentativas por IP e excedido.

---

## Frontend

- Armazenar token apos login (memoria ou `localStorage`).
- Interceptor Axios injeta `Authorization: Bearer <token>` em toda requisicao.
- `ProtectedRoute` verifica token antes de renderizar; redireciona para `/login` se ausente.
- Ao receber `401`: limpar token + redirecionar para `/login`.
- Logout: limpar token + `redirect /login`.

---

## Contrato REST

-> `../api/contracts.md` -- secao Autenticacao.
