# Escopo -- LegacyAI MVP

> [spec] Baseado no Documento de Escopo v1.0.

## Criterio de conclusao do MVP

Usuario autenticado cria projeto -> envia material valido -> inicia analise com provedor configurado -> consulta relatorio salvo.

---

## Dentro do escopo

| Area           | Detalhes                                                                    |
|----------------|------------------------------------------------------------------------------|
| Autenticacao   | Cadastro, login, JWT; usuario acessa apenas seus dados                       |
| Projetos       | CRUD: criar, listar, consultar, editar, excluir                              |
| Upload         | ZIP, README, .md, .txt; validacao de formato e tamanho                       |
| Analise        | Selecao de provedor (OpenAI, Claude, DeepSeek, Auto); uma por solicitacao|
| Relatorio      | Diagnostico padronizado; historico persistido                                |
| Infraestrutura | Docker Compose apenas para PostgreSQL                                        |
| Seguranca      | BCrypt, Bean Validation, Zip Slip, chaves em variaveis de ambiente           |

## Explicitamente fora do MVP

```
RAG / embeddings / banco vetorial
Kafka / RabbitMQ / Redis
Kubernetes / microsservicos
CI/CD complexo
Agentes autonomos / fine-tuning
Comparacao automatizada entre provedores
Alteracao automatica de codigo legado
Pull Requests e migracao automatica
Redux / gerenciamento de estado complexo
```

> Antes de adicionar qualquer tecnologia nao listada acima, verifique se e necessaria para o MVP.

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
`.git/`, `node_modules/`, `target/`, `build/`, `dist/`, `.idea/`, `.vscode/`,
binarios, arquivos acima do limite de tamanho.

## Modulos do backend e seus limites

| Modulo     | Responsabilidade              | Nao faz                           |
|------------|-------------------------------|-----------------------------------|
| `security` | JWT, BCrypt, filtros          | Logica de negocio                 |
| `project`  | CRUD, ownership               | Processar arquivos                |
| `file`     | Upload, extracao, filtro      | Chamar IA diretamente             |
| `analysis` | Orquestrar fluxo, status      | Implementar estrategia de IA      |
| `ai`       | Estrategias de provedor       | Conhecer modelo de projeto        |

## Evolucoes futuras (nao implementar agora)

RAG / comparacao entre provedores / analise de dependencias vulneraveis /
integracao GitHub-GitLab / sugestoes de codigo.
