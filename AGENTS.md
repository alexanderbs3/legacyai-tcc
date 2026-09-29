# LegacyAI -- Ponto de Entrada para Agentes

> **Nota:** a documentação de uso foi conferida com a implementação homologada em `c454191`.
> Em caso de divergência, verifique o código executável antes de alterar contratos ou guias.

## O que e o projeto

Plataforma web para analise tecnica de sistemas legados. O usuario envia codigo-fonte
compactado ou documentacao e recebe um relatorio de diagnostico gerado por IA, escolhendo
entre OpenAI, Claude, DeepSeek ou modo Automatico.

**Arquitetura:** monolito modular -- nao sao microsservicos.
**Stack:** Java 21 + Spring Boot | React + TypeScript + Vite | PostgreSQL.

---

## Regra fundamental

> Nao carregue o repositorio inteiro. Identifique o dominio da tarefa e leia apenas os arquivos necessarios.

---

## Mapa de contexto

| Dominio da tarefa                     | O que carregar                            |
|---------------------------------------|-------------------------------------------|
| Visao geral / arquitetura             | `ARCHITECTURE.md`                         |
| O que esta no escopo                  | `SCOPE.md`                                |
| Habilidades necessarias por area      | `SKILLS.md`                               |
| Qualquer tarefa de backend            | `backend/AGENTS.md` -> `backend/ARCHITECTURE.md` |
| Qualquer tarefa de frontend           | `frontend/AGENTS.md` -> `frontend/ARCHITECTURE.md` |
| Integracao / endpoint                 | `docs/api/contracts.md`                   |
| Feature: autenticacao e seguranca     | `docs/features/authentication.md`         |
| Feature: upload e processamento       | `docs/features/upload.md`                 |
| Feature: analise e provedores de IA   | `docs/features/analysis.md`               |
| Feature: relatorio                    | `docs/features/report.md`                 |
| Por que monolito?                     | `docs/decisions/ADR-001-monolith.md`      |
| Por que Strategy pattern?             | `docs/decisions/ADR-002-ai-strategy.md`   |

### Roteamento rapido por tipo de tarefa

```
Tarefa somente de backend
  -> backend/AGENTS.md -> backend/ARCHITECTURE.md -> docs/features/<feature>.md

Tarefa somente de frontend
  -> frontend/AGENTS.md -> frontend/ARCHITECTURE.md -> docs/features/<feature>.md

Tarefa envolve endpoint (integracao frontend <-> backend)
  -> docs/api/contracts.md -> backend/AGENTS.md + frontend/AGENTS.md

Duvida sobre escopo ou tecnologia
  -> SCOPE.md
```

---

## Protocolo de trabalho

```
1. Entender a tarefa e identificar o dominio.
2. Carregar somente a documentacao do dominio (ver mapa acima).
3. Localizar os arquivos de codigo relevantes.
4. Planejar em poucas linhas antes de implementar.
5. Implementar.
6. Executar testes e build do modulo afetado.
7. Verificar impacto no contrato de API, se relevante.
8. Atualizar documentacao somente se arquitetura, contrato ou BD mudou.
```

---

## Regras globais criticas

- **Chaves de API nunca no codigo ou em arquivos versionados.**
  Variaveis: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`.
- **Nao expandir o escopo sem necessidade.** Consulte `SCOPE.md` antes de adicionar tecnologias.
- **Codigo e a fonte da verdade.** Quando documentacao e codigo divergirem, verifique o codigo e corrija a documentacao.
- **Nao presuma.** Nao presuma endpoints, entidades, variaveis de ambiente ou comportamento -- verifique no codigo.
- **Nunca leia o repositorio inteiro por padrao.** Localize primeiro o menor conjunto de arquivos necessario.

## Diretorios a ignorar na analise

```
node_modules/   .next/    target/    build/    dist/
.git/           .idea/    .vscode/   coverage/
```

## Hierarquia de autoridade

```
Codigo executavel e configuracoes
        |
docs/api/contracts.md  .  docs/decisions/
        |
backend/ARCHITECTURE.md  |  frontend/ARCHITECTURE.md
        |
ARCHITECTURE.md  .  SCOPE.md
```
