# ADR-002 -- Strategy Pattern para Provedores de IA

**Status:** Aceita
**Contexto atual:** A plataforma implementa 3 providers de IA (OpenAI, Claude, DeepSeek) com APIs distintas e respostas em formatos diferentes.

## Decisao

Interface `AIProvider` com uma implementacao separada por provedor (Strategy Pattern).

## Justificativa

- `AnalysisService` depende da abstracao -- nunca das APIs externas diretamente.
- Adicionar um provedor: nova implementacao + configuracao + testes. Sem modificar codigo existente (Open/Closed Principle).
- Normalizacao de resposta encapsulada em cada estrategia -- o restante do sistema ve apenas `AIAnalysisResponse`.
- Facilita mocks em testes unitarios de `AnalysisService`.
- Diferencial academico: permite avaliacao experimental com multiplos modelos em contexto e prompt normalizados.

## Estrutura

```java
public interface AIProvider {
    AIAnalysisResponse analyze(AIAnalysisRequest request);
    String getProviderName();
    boolean isAvailable();
}
// Implementações: OpenAIProvider / ClaudeProvider / DeepSeekProvider
```

## Consequencias

- Cada estrategia gerencia sua propria chave de API e serializacao de request/response.
- Modo `AUTO`: usa OpenAI como padrão -- sem roteamento inteligente no MVP.
- Normalizacao e responsabilidade da estrategia, nunca do `AnalysisService`.
- Testar normalizacao de cada provedor de forma independente.
- `AnalysisInstructions` centraliza critérios comuns sem alterar o transporte/JSON de cada estratégia.
