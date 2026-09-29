# Avaliação experimental de provedores

Registro histórico de 25 de setembro de 2026; não descreve a disponibilidade da baseline homologada `c454191`.

## Protocolo

A avaliação usa o mesmo material de entrada para cada provedor habilitado. Para cada execução, registrar:

- tempo entre a criação da análise e `COMPLETED` ou `FAILED`;
- categorias presentes em `problems` e `securityRisks`;
- quantidade de recomendações;
- distribuição `HIGH` / `MEDIUM` / `LOW`;
- aderência ao esquema: os sete campos obrigatórios e itens com `title`, `description` e prioridade válida.

Projetos propostos, com características conhecidas:

| Projeto | Características a observar |
|---|---|
| Apache Struts 1 | Java legado, MVC clássico, XML e vulnerabilidades históricas conhecidas |
| JForum | Java web legado, persistência e superfície de autenticação |
| OpenMRS Legacy UI | JavaScript/Java, aplicação empresarial e modernização gradual |

## Resultados desta entrega

Em 25 de setembro de 2026, foram executadas três análises autenticadas contra a implementação OpenAI disponível, usando arquivos ZIP pequenos extraídos de Apache Struts 1, OpenMRS Legacy UI e OpenMRS Core. Claude e Gemini não tinham chave nem implementação no código naquela data, portanto não participaram. Essa referência a Gemini é apenas histórica: ele não integra o MVP atual.

| Projeto | Provedor | Tempo | Status | Recomendações | Prioridades | Esquema |
|---|---:|---:|---|---:|---|---|
| Apache Struts 1 | OPENAI | 2,06 s | FAILED | 0 | HIGH 0 / MEDIUM 0 / LOW 0 | indisponível |
| OpenMRS Legacy UI | OPENAI | 2,04 s | FAILED | 0 | HIGH 0 / MEDIUM 0 / LOW 0 | indisponível |
| OpenMRS Core | OPENAI | 2,04 s | FAILED | 0 | HIGH 0 / MEDIUM 0 / LOW 0 | indisponível |

As três requisições chegaram ao processamento assíncrono, mas não produziram relatório normalizado. Como o endpoint deliberadamente não expõe detalhes internos da falha, não há categorização, recomendações ou aderência de saída a registrar. Não foram inventadas métricas de sucesso.

## Limitações

- Na entrega avaliada naquela data, somente `OpenAIProvider` estava implementado. Na baseline homologada posterior, os providers são OpenAI, Claude e DeepSeek; os FAILED acima não representam a validação final do MVP.
- Resultados de IA não substituem revisão técnica humana.
- A composição e a cobertura do material enviado influenciam diretamente o diagnóstico e o tempo de resposta.

## Validação posterior do MVP

Claude, DeepSeek e OpenAI foram testados com entrada controlada e produziram o contrato estrutural de sete seções; diferenças semânticas motivaram o refinamento de `AnalysisInstructions` para exigir evidência positiva. Mesmo com instruções compartilhadas, saídas LLM são probabilísticas. Na homologação E2E da baseline `c454191`, uma análise real OpenAI chegou a `COMPLETED`, com relatório persistido e reaberto. Não inferir que a rodada E2E executou os três providers nem usar este registro histórico como ranking.
