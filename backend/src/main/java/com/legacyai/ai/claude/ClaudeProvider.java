package com.legacyai.ai.claude;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AIProvider;
import com.legacyai.ai.AnalysisInstructions;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.TimeValue;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class ClaudeProvider implements AIProvider {
    private static final String JSON_PROMPT = """
            Retorne SOMENTE um objeto JSON válido, sem texto adicional, sem markdown.
            O JSON deve seguir EXATAMENTE este esquema:
            {
              "summary": "string com visão geral",
              "technologies": ["string", "string"],
              "architecture": "string descrevendo a arquitetura",
              "problems": [{"title": "string", "description": "string", "priority": "HIGH"}],
              "securityRisks": [{"title": "string", "description": "string", "priority": "MEDIUM"}],
              "recommendations": [{"title": "string", "description": "string", "priority": "HIGH"}],
              "modernization": ["string", "string"]
            }
            Prioridades válidas: HIGH, MEDIUM, LOW.
            problems, securityRisks e recommendations DEVEM ser listas de objetos com
            title (string), description (string) e priority (HIGH|MEDIUM|LOW).
            NUNCA retorne essas listas como listas de strings.
            """;

    private final String key;
    private final String model;
    private final RestClient restClient;

    public ClaudeProvider(String key, String model) {
        this.key = key;
        this.model = model;
        this.restClient = restClient(10, 90);
    }

    @Autowired
    public ClaudeProvider(@Value("${ai.claude.api-key:}") String key,
                          @Value("${ai.claude.model:claude-haiku-4-5}") String model,
                          @Value("${ai.timeout.connect-seconds:10}") int connectTimeoutSeconds,
                          @Value("${ai.timeout.read-seconds:90}") int readTimeoutSeconds) {
        this.key = key;
        this.model = model;
        this.restClient = restClient(connectTimeoutSeconds, readTimeoutSeconds);
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
                    "messages", List.of(Map.of("role", "user", "content",
                            JSON_PROMPT + "\n\n" + AnalysisInstructions.TEXT + "\n\n" + request.context())));
            JsonNode response = restClient.post()
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
        String json = content.strip();
        if (json.startsWith("```") && json.endsWith("```")) {
            int openingLineEnd = json.indexOf('\n');
            if (openingLineEnd >= 0) {
                json = json.substring(openingLineEnd + 1, json.length() - 3).strip();
            }
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(json);
        if (root instanceof ObjectNode objectRoot) {
            for (String field : List.of("problems", "securityRisks", "recommendations")) {
                JsonNode items = objectRoot.get(field);
                if (items != null && items.isArray()) {
                    ArrayNode fixed = mapper.createArrayNode();
                    for (JsonNode item : items) {
                        if (item.isTextual()) {
                            String text = item.asText();
                            ObjectNode reportItem = mapper.createObjectNode();
                            reportItem.put("title", text.length() > 80 ? text.substring(0, 80) : text);
                            reportItem.put("description", text);
                            reportItem.put("priority", "MEDIUM");
                            fixed.add(reportItem);
                        } else {
                            fixed.add(item);
                        }
                    }
                    objectRoot.set(field, fixed);
                }
            }
        }
        return mapper.treeToValue(root, AIAnalysisResponse.class);
    }

    private static RestClient restClient(int connectTimeoutSeconds, int readTimeoutSeconds) {
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(connectTimeoutSeconds))
                .setResponseTimeout(Timeout.ofSeconds(readTimeoutSeconds))
                .build();
        return RestClient.builder()
                .baseUrl("https://api.anthropic.com")
                .requestFactory(new HttpComponentsClientHttpRequestFactory(HttpClients.custom()
                        .setDefaultRequestConfig(requestConfig)
                        .setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create()
                                .setConnectionTimeToLive(TimeValue.ofSeconds(connectTimeoutSeconds))
                                .build())
                        .build()))
                .build();
    }
}
