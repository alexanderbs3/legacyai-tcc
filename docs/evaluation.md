# Avaliação experimental de provedores

Data do documento: 25 de setembro de 2026.

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

Em 25 de setembro de 2026, foram executadas três análises autenticadas contra a implementação OpenAI disponível, usando arquivos ZIP pequenos extraídos de Apache Struts 1, OpenMRS Legacy UI e OpenMRS Core. Claude e Gemini não tinham chave nem implementação no código naquela data, portanto não participaram.

| Projeto | Provedor | Tempo | Status | Recomendações | Prioridades | Esquema |
|---|---:|---:|---|---:|---|---|
| Apache Struts 1 | OPENAI | 2,06 s | FAILED | 0 | HIGH 0 / MEDIUM 0 / LOW 0 | indisponível |
| OpenMRS Legacy UI | OPENAI | 2,04 s | FAILED | 0 | HIGH 0 / MEDIUM 0 / LOW 0 | indisponível |
| OpenMRS Core | OPENAI | 2,04 s | FAILED | 0 | HIGH 0 / MEDIUM 0 / LOW 0 | indisponível |

As três requisições chegaram ao processamento assíncrono, mas não produziram relatório normalizado. Como o endpoint deliberadamente não expõe detalhes internos da falha, não há categorização, recomendações ou aderência de saída a registrar. Não foram inventadas métricas de sucesso.

## Limitações

- O MVP atual possui somente `OpenAIProvider`; os demais provedores documentados no contrato ainda não existem no código.
- Resultados de IA não substituem revisão técnica humana.
- A composição e a cobertura do material enviado influenciam diretamente o diagnóstico e o tempo de resposta.
