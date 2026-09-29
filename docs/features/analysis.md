# Feature: Analise e Provedores de IA

> Carregar este arquivo quando trabalhar em: AIProvider, AnalysisService, status de analise ou integracao com provedores externos.

## Fluxo de analise

```
POST /api/projects/{id}/analyses
  -> verificar ownership, provider conhecido e ao menos um arquivo
  -> criar Analysis com status PENDING
  -> retornar 202 Accepted + analysisId imediatamente
  -> CompletableFuture.runAsync no processo do backend
     -> Analysis -> PROCESSING
     -> FileProcessor + ProjectContextBuilder
     -> AIProvider.analyze(AIAnalysisRequest)
     -> normalizar resposta -> AIAnalysisResponse
     -> salvar AnalysisResult
     -> Analysis -> COMPLETED (ou FAILED em erro)
```

Frontend faz polling em `GET /api/analyses/{id}` ate status final. Não há fila
externa durável. Projeto sem arquivo recebe HTTP 400 `INVALID_FILE` antes da
criação da análise; arquivo aceito sem texto processável pode resultar em
`FAILED` após o 202, sem pedir à IA um relatório a partir de contexto vazio.

---

## Backend -- pacote `com.legacyai.ai`

### Interface AIProvider

```java
public interface AIProvider {
    AIAnalysisResponse analyze(AIAnalysisRequest request);
    String getProviderName();   // "OPENAI" | "CLAUDE" | "DEEPSEEK"
    boolean isAvailable();      // false se variavel de ambiente da chave nao configurada
}
```

### Selecao de provedor

| Modo    | Comportamento                                                           |
|---------|-------------------------------------------------------------------------|
| `AUTO`  | Usa `OPENAI` como provedor padrao; sem roteamento inteligente no MVP   |
| Manual  | `AnalysisService` seleciona pelo nome recebido no request               |

`isAvailable()` retorna `false` quando a chave configurada está vazia; isso não
comprova validade da credencial, créditos ou resposta da API externa.
O `AnalysisService` nao deve depender de APIs externas diretamente -- somente da interface.

### AIAnalysisRequest

Contém o contexto produzido pelo `ProjectContextBuilder`, limitado a 12.000
caracteres Java por padrão (não conta tokens por provider).

### AIAnalysisResponse (saida normalizada)

Corresponde ao esquema de `AnalysisResult`:
`summary / technologies / architecture / problems / securityRisks / recommendations / modernization`

Normalizacao e responsabilidade da estrategia -- nunca do `AnalysisService`.

`AnalysisInstructions` centraliza critérios semânticos comuns para Claude, DeepSeek e OpenAI:
pt-BR, identificadores técnicos preservados, afirmações baseadas somente no contexto,
incerteza explícita e prioridades `HIGH` / `MEDIUM` / `LOW` pelo impacto sustentado.
Informação insuficiente não é achado; ausência no recorte não comprova ausência
no projeto. `problems`, `securityRisks`, `recommendations` e `modernization`
podem ser listas vazias quando não há evidência positiva.
Cada estrategia conserva o transporte, o formato JSON exigido pela API, o parsing e
o tratamento de erros; a OpenAI continua usando JSON Schema com `strict=true` para a estrutura.

---

## Status de analise

| Status        | Significado                                                |
|---------------|------------------------------------------------------------|
| `PENDING`     | Criada, aguardando inicio do processamento                 |
| `PROCESSING`  | Contexto sendo construido ou chamada a IA em andamento     |
| `COMPLETED`   | Relatorio disponivel em `AnalysisResult`                   |
| `FAILED`      | Erro; `errorMessage` recebe mensagem pública classificada ou genérica segura |

Mensagens inesperadas não são persistidas nem expostas diretamente; a leitura de análises antigas também filtra mensagens não classificadas. Saídas LLM continuam probabilísticas: instruções compartilhadas reduzem divergências, mas não garantem ausência de inferências incorretas ou omissões.

## Validação dos providers

Na validação do MVP, Claude, DeepSeek e OpenAI foram testados com entrada controlada e produziram a estrutura de sete seções esperada. Foram observadas diferenças semânticas entre respostas; as instruções compartilhadas foram refinadas para exigir evidência positiva antes de criar achados ou ações. Mesmo após o refinamento, resultados não são determinísticos e não substituem revisão humana. Não há ranking entre providers. O fluxo E2E final exercitou uma análise real OpenAI até `COMPLETED`; não confundir essa rodada com execução E2E dos três.

O [registro experimental anterior](../evaluation.md) é histórico e descreve outra versão do produto.

---

## Adicionar novo provedor

-> Instrucoes em `../../backend/AGENTS.md` -- secao "Adicionar novo provedor de IA".
-> Padrao justificado em `../../docs/decisions/ADR-002-ai-strategy.md`.

## Variaveis de ambiente

```
OPENAI_API_KEY     ANTHROPIC_API_KEY    DEEPSEEK_API_KEY
```

## Contrato REST

-> `../api/contracts.md` -- secao Analise.
