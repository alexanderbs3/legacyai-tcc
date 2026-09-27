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

> O relatorio deve exibir o aviso: "Este relatorio e uma recomendacao automatizada sujeita a validacao tecnica humana."

---

## Backend

**Entidade:** `AnalysisResult` -- campos compostos armazenados como `TEXT` ou JSON no MVP.
**Servico:** `AnalysisService` persiste o resultado apos normalizacao pela estrategia do provedor.

Quando a resposta do provedor externo nao vier no formato esperado, o adaptador da estrategia normaliza antes de persistir. O `AnalysisService` nunca faz parsing da resposta bruta do provedor.

---

## Frontend -- Pagina de Resultado

**Rota:** `/analyses/:id`
**Endpoint:** `GET /api/analyses/{id}` -- campo `result` presente somente quando `status == COMPLETED`

### Organizacao sugerida das secoes

1. **Summary** -- visao geral textual
2. **Technologies** -- lista de tecnologias identificadas
3. **Architecture** -- descricao da arquitetura
4. **Problems** -- cards com titulo, descricao e badge de prioridade
5. **Security Risks** -- cards com badge de prioridade
6. **Recommendations** -- cards; destaque visual para `HIGH`
7. **Modernization** -- lista de acoes graduais

**Badges de prioridade [spec]:** `HIGH` -> vermelho / `MEDIUM` -> amarelo / `LOW` -> verde

---

## Contrato REST

-> `../api/contracts.md` -- secao Analise, endpoint `GET /api/analyses/{id}`.
