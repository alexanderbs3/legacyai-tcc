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
- Services verificam **ownership** antes de operar sobre recursos (para arquivos e análises, pelo projeto de origem).
- Repositories sao interfaces JPA sem logica de negocio.

## Regras obrigatorias

| Regra            | Detalhe                                                                              |
|------------------|--------------------------------------------------------------------------------------|
| Ownership        | Conferir o usuário dono do projeto (ou entidade raiz) no service; retornar `403` para outro usuário. |
| Sem stacktrace   | `ApiExceptionHandler` mapeia falhas conhecidas; não expor detalhes internos ao cliente. |
| Bean Validation  | `@Valid` nos parametros dos controllers; anotacoes de validacao nos DTOs de entrada. |
| Chaves de API    | Nunca em codigo ou `.properties` versionado. Somente em variaveis de ambiente.       |
| Temporarios      | Limpar apenas a cópia de trabalho da análise; preservar o upload armazenado para reutilização. |

## Adicionar novo provedor de IA

```
1. Criar pacote com.legacyai.ai/<provedor>/
2. Implementar AIProvider: analyze(), getProviderName(), isAvailable()
3. Conferir binding de propriedade em application.properties e @Value; isAvailable() retorna false se chave vazia
4. Anotar como @Component ou @Service
5. Escrever testes de normalizacao da resposta
6. NAO alterar AnalysisService, ProjectService, controllers ou modelo de relatorio
```

-> Padrao justificado em: `../docs/decisions/ADR-002-ai-strategy.md`

## Regras de upload e processamento

- Validar extensão E MIME do upload; o conteúdo do ZIP só é filtrado durante a análise.
- Extracao de ZIP: normalizar caminhos; confirmar que os arquivos extraidos ficam dentro do diretorio temporario.
- Ignorar: `.git/`, `node_modules/`, `target/`, `build/`, `dist/`, `.idea/`, `.vscode/`, binarios.
- `ProjectContextBuilder` limita o contexto a 12.000 caracteres Java por padrão; não há contagem de tokens por provider.

-> Detalhes completos: `../docs/features/upload.md`

## Comandos

```bash
# Banco de dados via Docker (na raiz do repositório, com POSTGRES_PASSWORD exportada)
docker compose -f backend/docker-compose.yml up -d postgres

# Entrar no módulo backend para os comandos Maven
cd backend

# Executar testes
mvn test

# Build sem testes
mvn package -DskipTests

# Iniciar backend localmente
mvn spring-boot:run
```

## Variaveis de ambiente necessarias

```
POSTGRES_PASSWORD (Compose)       SPRING_DATASOURCE_PASSWORD (Spring e Flyway)
JWT_SECRET (texto UTF-8, pelo menos 32 bytes)
OPENAI_API_KEY     ANTHROPIC_API_KEY     DEEPSEEK_API_KEY (opcionais por provider)
```

O backend não carrega `.env` automaticamente: exportar no shell ou configurar no launcher/IntelliJ. `POSTGRES_URL` e `POSTGRES_USERNAME` não são lidos pelas propriedades atuais; verificar `src/main/resources/application.properties` para as URLs de datasource/Flyway.

## Nao fazer

- Nao adicionar Kafka, Redis, RabbitMQ, microsservicos. Ver `../SCOPE.md`.
- Nao retornar entidades JPA diretamente -- sempre DTOs.
- Nao hardcodar chaves ou URLs de provedores de IA.
- Nao presumir estrutura do banco ou endpoints sem verificar.
