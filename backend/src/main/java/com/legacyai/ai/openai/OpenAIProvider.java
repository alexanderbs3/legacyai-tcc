package com.legacyai.ai.openai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AIProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Component
public class OpenAIProvider implements AIProvider {
    private final String key;
    private final String model;
    private final ObjectMapper json = new ObjectMapper();

    public OpenAIProvider(@Value("${OPENAI_API_KEY:}") String key,
                          @Value("${openai.model:gpt-4.1-mini}") String model) {
        this.key = key;
        this.model = model;
    }

    @Override public boolean isAvailable() { return !key.isBlank(); }
    @Override public String getProviderName() { return "OPENAI"; }

    @Override
    public AIAnalysisResponse analyze(AIAnalysisRequest request) {
        if (!isAvailable()) throw new IllegalStateException("OPENAI_API_KEY não configurada");
        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", "Retorne somente JSON com summary, technologies, architecture, problems, securityRisks, recommendations, modernization."),
                            Map.of("role", "user", "content", request.context())),
                    "response_format", Map.of("type", "json_object"));
            JsonNode response = RestClient.create("https://api.openai.com/v1").post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + key)
                    .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
            return normalize(response.at("/choices/0/message/content").asText());
        } catch (RestClientResponseException exception) {
            throw new IllegalStateException(failureMessage(exception.getStatusCode()), exception);
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível conectar à OpenAI. Tente novamente mais tarde.", exception);
        }
    }

    static String failureMessage(org.springframework.http.HttpStatusCode status) {
        return switch (status.value()) {
            case 401, 403 -> "OpenAI recusou as credenciais. Verifique OPENAI_API_KEY.";
            case 429 -> "OpenAI não pôde processar a análise: limite de uso ou créditos esgotados.";
            default -> "OpenAI retornou erro HTTP " + status.value() + ". Tente novamente mais tarde.";
        };
    }

    static AIAnalysisResponse normalize(String content) throws Exception {
        return new ObjectMapper().treeToValue(new ObjectMapper().readTree(content), AIAnalysisResponse.class);
    }
}
