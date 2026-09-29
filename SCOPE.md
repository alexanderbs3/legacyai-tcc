# Escopo -- LegacyAI MVP

> Escopo da implementação homologada em `c454191`; propostas futuras são separadas abaixo.

## Criterio de conclusao do MVP

Usuario autenticado cria projeto -> envia material valido -> inicia analise com provedor configurado -> consulta relatorio salvo.

---

## Implementado no MVP

| Área | Detalhes |
|---|---|
| Autenticação | Cadastro, login, JWT; usuário acessa apenas seus dados |
| Projetos | CRUD: criar, listar, consultar, editar, excluir |
| Upload | ZIP, README, `.md`, `.txt`; validação de formato e tamanho |
| Análise | Seleção de provider (OpenAI, Claude, DeepSeek, AUTO); HTTP 202 e status assíncronos |
| Relatório | Sete seções padronizadas; histórico persistido, reabertura e Dashboard |
| Infraestrutura | Docker Compose somente para PostgreSQL |
| Segurança | BCrypt, Bean Validation, Zip Slip, chaves em variáveis de ambiente |

O projeto precisa de pelo menos um arquivo enviado para iniciar a análise. Upload direto aceita ZIP, `.md`, `.txt` e `README` sem extensão (com validação de MIME/tamanho), mas somente texto UTF-8 processável alimenta o diagnóstico. Não há extração de texto de PDF. O modo `AUTO` usa OpenAI como padrão; não compara providers. Arquivos enviados ficam no diretório configurado em `upload.temp-dir`, com metadados no PostgreSQL.

## Fora do escopo / evoluções futuras

```
RAG / embeddings / banco vetorial
Kafka / RabbitMQ / Redis
Kubernetes / microsservicos
CI/CD complexo
Agentes autonomos / fine-tuning
Comparacao automatizada entre providers
Alteracao automatica de codigo legado
Pull Requests e migracao automatica
Redux / gerenciamento de estado complexo
Extracao de texto de PDF
Importacao direta de repositorios Git
Analise de projetos maiores que o contexto atual
Recursos avancados de relatorio
```

São possibilidades, não um roadmap obrigatório. O MVP também não tem fila externa durável para análises.

---

## Limites entre camadas

- Frontend acessa dados exclusivamente via REST API -- nunca diretamente ao banco.
- Modulo `ai` recebe apenas o contexto construido -- desconhece logica de projeto ou upload.
- Adicionar provedor de IA: nova implementacao de `AIProvider` + configuracao + testes.
  **Nao altera** controllers, services de projeto ou modelo de relatorio.

## Formatos de arquivo aceitos no upload

| Formato   | Observacao                                       |
|-----------|--------------------------------------------------|
| `.zip`    | Extracao segura com protecao Zip Slip            |
| `.md`     | Markdown                                         |
| `.txt`    | Texto simples                                    |
| `README`  | Sem extensao                                     |

**Ignorados durante extracao ZIP:**
`.git/`, `node_modules/`, `target/`, `build/`, `dist/`, `.idea/`, `.vscode/`
e arquivos binários ou sem texto UTF-8 processável. O limite de 70 MB aplica-se ao upload direto; não há filtro separado por tamanho de entrada do ZIP na implementação.

## Modulos do backend e seus limites

| Modulo     | Responsabilidade              | Nao faz                           |
|------------|-------------------------------|-----------------------------------|
| `security` | JWT, BCrypt, filtros          | Logica de negocio                 |
| `project`  | CRUD, ownership               | Processar arquivos                |
| `file`     | Upload, extracao, filtro      | Chamar IA diretamente             |
| `analysis` | Orquestrar fluxo, status      | Implementar estrategia de IA      |
| `ai`       | Estrategias de provedor       | Conhecer modelo de projeto        |
