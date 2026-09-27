package com.legacyai.ai.claude;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AIProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class ClaudeProvider implements AIProvider {
    private static final String JSON_PROMPT = "Retorne somente JSON com summary, technologies, architecture, problems, securityRisks, recommendations, modernization.";

    private final String key;
    private final String model;

    public ClaudeProvider(@Value("${ai.claude.api-key:}") String key,
                          @Value("${ai.claude.model:claude-3-5-haiku-20241022}") String model) {
        this.key = key;
        this.model = model;
    }

    @Override
    public boolean isAvailable() {
        return key != null && !key.isBlank();
    }

    @Override
    public String getProviderName() {
        return "CLAUDE";
    }

    @Override
    public AIAnalysisResponse analyze(AIAnalysisRequest request) {
        if (!isAvailable()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY não configurada");
        }

        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "max_tokens", 4096,
                    "messages", List.of(Map.of("role", "user", "content", JSON_PROMPT + "\n\n" + request.context())));
            JsonNode response = RestClient.create("https://api.anthropic.com").post()
                    .uri("/v1/messages")
                    .header("x-api-key", key)
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return normalize(response.at("/content/0/text").asText());
        } catch (RestClientResponseException exception) {
            throw new IllegalStateException(failureMessage(exception.getStatusCode()), exception);
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível conectar ao Claude. Tente novamente mais tarde.", exception);
        }
    }

    static String failureMessage(org.springframework.http.HttpStatusCode status) {
        return switch (status.value()) {
            case 401, 403 -> "Claude recusou as credenciais. Verifique ANTHROPIC_API_KEY.";
            case 429 -> "Claude não pôde processar a análise: limite de uso ou créditos esgotados.";
            default -> "Claude retornou erro HTTP " + status.value() + ". Tente novamente mais tarde.";
        };
    }

    static AIAnalysisResponse normalize(String content) throws Exception {
        return new ObjectMapper().treeToValue(new ObjectMapper().readTree(content), AIAnalysisResponse.class);
    }
}
