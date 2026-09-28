# Backend -- Instrucoes para Agentes

> Contexto global e mapa de documentacao: `../AGENTS.md`
> Contrato de endpoints: `../docs/api/contracts.md`

## Inicio rapido

1. Identifique o modulo afetado (tabela abaixo).
2. Localize os arquivos em `src/main/java/com/legacyai/<modulo>/`.
3. Se a tarefa toca um endpoint, consulte `../docs/api/contracts.md` -- nao adivinhe contratos.
4. Para features especificas: `../docs/features/<feature>.md`.

## Mapa de modulos

| Modulo     | Pacote                         | Responsabilidade                                  |
|------------|--------------------------------|---------------------------------------------------|
| security   | `com.legacyai.security`        | JWT, BCrypt, filtros de autenticacao              |
| project    | `com.legacyai.project`         | CRUD de projetos, verificacao de ownership        |
| file       | `com.legacyai.file`            | Upload, validacao, extracao ZIP, filtro de conteudo|
| analysis   | `com.legacyai.analysis`        | Orquestracao, status, persistencia do relatorio   |
| ai         | `com.legacyai.ai`              | Interface AIProvider + estrategias por provedor   |
| shared     | `com.legacyai.{controller,dto,exception,config}` | Camadas transversais         |

## Padrao de implementacao

```
Request -> Controller (DTO in/out) -> Service (negocio + ownership) -> Repository -> Entity
                                            |
                                       AIProvider.analyze()  (somente em analysis)
```

- Controllers recebem e retornam **DTOs** (nunca entidades JPA).
- Services verificam **ownership** antes de qualquer operacao sobre recursos.
- Repositories sao interfaces JPA sem logica de negocio.

## Regras obrigatorias

| Regra            | Detalhe                                                                              |
|------------------|--------------------------------------------------------------------------------------|
| Ownership        | `resource.getUserId().equals(authenticatedUserId)` em todo service. Retornar `403`. |
| Sem stacktrace   | `@ControllerAdvice` trata todas as excecoes; nunca expor detalhe interno ao cliente. |
| Bean Validation  | `@Valid` nos parametros dos controllers; anotacoes de validacao nos DTOs de entrada. |
| Chaves de API    | Nunca em codigo ou `.properties` versionado. Somente em variaveis de ambiente.       |
| Temporarios      | Limpar arquivos temporarios de upload em `finally` ou try-with-resources.            |

## Adicionar novo provedor de IA

```
1. Criar pacote com.legacyai.ai/<provedor>/
2. Implementar AIProvider: analyze(), getProviderName(), isAvailable()
3. Ler chave via @Value("${PROVIDER_API_KEY:}") -- isAvailable() retorna false se vazia
4. Anotar como @Component ou @Service
5. Escrever testes de normalizacao da resposta
6. NAO alterar AnalysisService, ProjectService, controllers ou modelo de relatorio
```

-> Padrao justificado em: `../docs/decisions/ADR-002-ai-strategy.md`

## Regras de upload e processamento

- Validar extensao E tipo MIME -- nao confiar so no nome do arquivo.
- Extracao de ZIP: normalizar caminhos; confirmar que os arquivos extraidos ficam dentro do diretorio temporario.
- Ignorar: `.git/`, `node_modules/`, `target/`, `build/`, `dist/`, `.idea/`, `.vscode/`, binarios.
- `ProjectContextBuilder` deve limitar o contexto ao limite de tokens do provedor.

-> Detalhes completos: `../docs/features/upload.md`

## Comandos

```bash
# Banco de dados via Docker
docker compose up -d postgres

# Executar testes
mvn test

# Build sem testes
mvn package -DskipTests

# Iniciar backend localmente
mvn spring-boot:run
```

## Variaveis de ambiente necessarias

```
POSTGRES_URL        POSTGRES_USERNAME    POSTGRES_PASSWORD
JWT_SECRET
OPENAI_API_KEY      ANTHROPIC_API_KEY    DEEPSEEK_API_KEY
```

## Nao fazer

- Nao adicionar Kafka, Redis, RabbitMQ, microsservicos. Ver `../SCOPE.md`.
- Nao retornar entidades JPA diretamente -- sempre DTOs.
- Nao hardcodar chaves ou URLs de provedores de IA.
- Nao presumir estrutura do banco ou endpoints sem verificar.
