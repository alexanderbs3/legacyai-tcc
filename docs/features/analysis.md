# Feature: Analise e Provedores de IA

> Carregar este arquivo quando trabalhar em: AIProvider, AnalysisService, status de analise ou integracao com provedores externos.

## Fluxo de analise

```
POST /api/projects/{id}/analyses
  -> criar Analysis com status PENDING
  -> retornar 202 Accepted + analysisId imediatamente
  -> [spec: verificar se o processamento e sincrono ou assincrono na implementacao]
     -> FileProcessor + ProjectContextBuilder
     -> Analysis -> PROCESSING
     -> AIProvider.analyze(AIAnalysisRequest)
     -> normalizar resposta -> AIAnalysisResponse
     -> salvar AnalysisResult
     -> Analysis -> COMPLETED (ou FAILED em erro)
```

Frontend faz polling em `GET /api/analyses/{id}` ate status final.

---

## Backend -- pacote `com.legacyai.ai`

### Interface AIProvider

```java
public interface AIProvider {
    AIAnalysisResponse analyze(AIAnalysisRequest request);
    String getProviderName();   // "OPENAI" | "CLAUDE" | "GEMINI"
    boolean isAvailable();      // false se variavel de ambiente da chave nao configurada
}
```

### Selecao de provedor

| Modo    | Comportamento                                                           |
|---------|-------------------------------------------------------------------------|
| `AUTO`  | Usa o provedor padrao habilitado; sem roteamento inteligente no MVP     |
| Manual  | `AnalysisService` seleciona pelo nome recebido no request               |

`isAvailable()` retorna `false` quando a variavel de ambiente da chave nao esta configurada.
O `AnalysisService` nao deve depender de APIs externas diretamente -- somente da interface.

### AIAnalysisRequest

Contem o contexto produzido pelo `ProjectContextBuilder` -- formato compacto e limitado por tokens.

### AIAnalysisResponse (saida normalizada)

Corresponde ao esquema de `AnalysisResult`:
`summary / technologies / architecture / problems / securityRisks / recommendations / modernization`

Normalizacao e responsabilidade da estrategia -- nunca do `AnalysisService`.

---

## Status de analise

| Status        | Significado                                                |
|---------------|------------------------------------------------------------|
| `PENDING`     | Criada, aguardando inicio do processamento                 |
| `PROCESSING`  | Contexto sendo construido ou chamada a IA em andamento     |
| `COMPLETED`   | Relatorio disponivel em `AnalysisResult`                   |
| `FAILED`      | Erro; `errorMessage` preenchido em `Analysis`              |

---

## Adicionar novo provedor

-> Instrucoes em `../../backend/AGENTS.md` -- secao "Adicionar novo provedor de IA".
-> Padrao justificado em `../../docs/decisions/ADR-002-ai-strategy.md`.

## Variaveis de ambiente

```
OPENAI_API_KEY     ANTHROPIC_API_KEY    GEMINI_API_KEY
```

## Contrato REST

-> `../api/contracts.md` -- secao Analise.
