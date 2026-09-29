# Skills Necessarias -- LegacyAI

Conhecimento especifico para trabalhar **neste projeto**. Nao e tutorial das tecnologias.

---

## Backend

### Java 21 + Spring Boot

- Interfaces para abstracao: `AIProvider` e o exemplo central do projeto.
- Anotacoes: `@RestController`, `@Service`, `@Repository`, `@Entity`, injecao de dependencia via construtor.
- `@Valid` + `ConstraintViolation` para Bean Validation nos DTOs de entrada.
- `@ControllerAdvice` + `@ExceptionHandler` para tratamento global de excecoes.
- Spring Data JPA: `JpaRepository`, queries derivadas ou `@Query`.
- DTOs de entrada e saida separados das entidades JPA -- nunca retornar entidade diretamente.

### Spring Security

- Filtro JWT stateless (sem sessao em servidor).
- `BCryptPasswordEncoder` para senhas -- nunca armazenar em claro.
- Verificacao de ownership nos services antes de qualquer operacao sobre recursos.

### Strategy Pattern -- Provedores de IA

- Interface `AIProvider`: `analyze()`, `getProviderName()`, `isAvailable()`.
- Cada provedor implementa a interface de forma independente.
- `AnalysisService` seleciona o provedor por nome ou usa o padrao (`AUTO`).
- Normalizacao da resposta externa para `AIAnalysisResponse` e responsabilidade da estrategia -- nunca do service.

### Processamento seguro de arquivos

- Validar extensao E tipo MIME -- nao confiar apenas no nome.
- Extracao de ZIP: normalizar caminhos e confirmar que ficam dentro do diretorio temporario (Zip Slip).
- Limpeza de temporarios em `finally` ou try-with-resources.
- `ProjectContextBuilder`: contexto limitado a 12.000 caracteres Java por padrão, não por tokens; priorizar README e manifests.

### PostgreSQL + JPA

- UUID como PK; entidades de projeto, arquivo, análise e resultado usam campos UUID para referência (não presumir anotações `@OneToMany`/`@ManyToOne`).
- `Analysis.status` como enum Java (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- Campos compostos de `AnalysisResult` em colunas `TEXT`, com listas serializadas em JSON.

### Testes

- JUnit 5 + Mockito para servicos.
- Prioridades: validacao de upload (extensoes, Zip Slip), ownership (-> 403), normalizacao de resposta de IA.
- `mvn test` | `mvn package -DskipTests`

---

## Frontend

### React + TypeScript + Vite

- Componentes funcionais com hooks (`useState`, `useEffect`).
- Tipagem de props e respostas de API com interfaces TypeScript em `src/types/`.
- Roteamento: React Router v6 -- `<Routes>`, `<Route>`, `useNavigate`, `useParams`.

### Comunicacao com API

- Instancia Axios centralizada em `src/services/api.ts` (baseURL + interceptors).
- HTTP: `401` -> logout + redirect; `403` -> acesso negado; `500` -> mensagem generica.
- Feedback de loading e erro em todas as chamadas assincronas.
- Polling de status: `GET /api/analyses/{id}` ate `COMPLETED` ou `FAILED`; parar ao desmontar componente.

### Estado e autenticacao

- Token JWT em `localStorage`; sem Redux no MVP.
- `ProtectedRoute` verifica token; redireciona para `/login` se ausente.
- Limpar token no logout.

---

## Infraestrutura

- **Docker Compose:** somente PostgreSQL. Backend e frontend rodam localmente.
- **`.env`** (nao versionado): exportar no shell ou configurar no launcher; o backend não carrega automaticamente. **`.env.example`** (versionado): placeholders sem segredos.

### Variáveis de ambiente no fluxo local

```
POSTGRES_PASSWORD            # Compose
SPRING_DATASOURCE_PASSWORD  # Spring/Flyway; mesmo valor do Compose local
JWT_SECRET                   # UTF-8, pelo menos 32 bytes
OPENAI_API_KEY               # opcional, habilita OpenAI
ANTHROPIC_API_KEY            # opcional, habilita Claude
DEEPSEEK_API_KEY             # opcional, habilita DeepSeek
```
