# Feature: Relatorio

> Carregar este arquivo quando trabalhar em: geracao, persistencia ou exibicao do relatorio de diagnostico.

## Esquema padronizado

O relatorio e normalizado independentemente do provedor:

```json
{
  "summary": "Visao geral e principais achados do sistema legado.",
  "technologies": ["Java 8", "Spring MVC", "MySQL"],
  "architecture": "Descricao da estrutura identificada.",
  "problems": [
    { "title": "string", "description": "string", "priority": "HIGH | MEDIUM | LOW" }
  ],
  "securityRisks": [
    { "title": "string", "description": "string", "priority": "MEDIUM" }
  ],
  "recommendations": [
    { "title": "string", "description": "string", "priority": "HIGH" }
  ],
  "modernization": ["Acao gradual sugerida"]
}
```

**Prioridades:** `HIGH` / `MEDIUM` / `LOW`

O frontend exibe: “Este relatório contém recomendações automatizadas e deve ser validado por uma pessoa técnica antes de qualquer decisão.”

---

## Backend

**Entidade:** `AnalysisResult` -- campos compostos em colunas `TEXT`; listas serializadas em JSON.
**Servico:** `AnalysisService` persiste o resultado apos normalizacao pela estrategia do provedor.

Cada provider extrai e normaliza a resposta externa; se não conseguir produzir o contrato esperado, a análise falha sem persistir relatório. O `AnalysisService` nunca faz parsing da resposta bruta do provider.

---

## Frontend -- Pagina de Resultado

**Rota:** `/analyses/:id`
**Endpoint:** `GET /api/analyses/{id}` -- campo `result` não nulo somente quando `status == COMPLETED`; nos demais estados é `null`.

### Seções exibidas atualmente

1. **Resumo** -- visão geral textual
2. **Tecnologias identificadas** -- lista de tecnologias
3. **Arquitetura** -- descrição da estrutura
4. **Problemas** -- cards com título, descrição e prioridade
5. **Riscos de segurança** -- cards com prioridade
6. **Recomendações** -- cards com prioridade
7. **Modernização** -- lista de ações

**Prioridades:** `HIGH` → Alta, `MEDIUM` → Média, `LOW` → Baixa. Listas vazias exibem estado apropriado, sem criar achados artificiais.

---

## Contrato REST

-> `../api/contracts.md` -- secao Analise, endpoint `GET /api/analyses/{id}`.
