package com.legacyai.ai.gemini;

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
public class GeminiProvider implements AIProvider {
    private static final String JSON_PROMPT = "Retorne somente JSON com summary, technologies, architecture, problems, securityRisks, recommendations, modernization.";

    private final String key;
    private final String model;

    public GeminiProvider(@Value("${ai.gemini.api-key:}") String key,
                          @Value("${ai.gemini.model:gemini-2.0-flash}") String model) {
        this.key = key;
        this.model = model;
    }

    @Override
    public boolean isAvailable() {
        return key != null && !key.isBlank();
    }

    @Override
    public String getProviderName() {
        return "GEMINI";
    }

    @Override
    public AIAnalysisResponse analyze(AIAnalysisRequest request) {
        if (!isAvailable()) {
            throw new IllegalStateException("GEMINI_API_KEY não configurada");
        }

        try {
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", JSON_PROMPT + "\n\n" + request.context())))),
                    "generationConfig", Map.of("responseMimeType", "application/json"));
            JsonNode response = RestClient.create("https://generativelanguage.googleapis.com").post()
                    .uri("/v1beta/models/{model}:generateContent?key={key}", model, key)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return normalize(response.at("/candidates/0/content/parts/0/text").asText());
        } catch (RestClientResponseException exception) {
            throw new IllegalStateException(failureMessage(exception.getStatusCode()), exception);
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível conectar ao Gemini. Tente novamente mais tarde.", exception);
        }
    }

    static String failureMessage(org.springframework.http.HttpStatusCode status) {
        return switch (status.value()) {
            case 401, 403 -> "Gemini recusou as credenciais. Verifique GEMINI_API_KEY.";
            case 429 -> "Gemini não pôde processar a análise: limite de uso ou créditos esgotados.";
            default -> "Gemini retornou erro HTTP " + status.value() + ". Tente novamente mais tarde.";
        };
    }

    static AIAnalysisResponse normalize(String content) throws Exception {
        return new ObjectMapper().treeToValue(new ObjectMapper().readTree(content), AIAnalysisResponse.class);
    }
}
