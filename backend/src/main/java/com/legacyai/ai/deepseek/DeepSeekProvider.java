package com.legacyai.ai.deepseek;

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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class DeepSeekProvider implements AIProvider {
    private static final Logger log = LoggerFactory.getLogger(DeepSeekProvider.class);
    private static final int MAX_RETRIES = 3;
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

    public DeepSeekProvider(String key, String model) {
        this.key = key;
        this.model = model;
        this.restClient = restClient(10, 90);
    }

    @Autowired
    public DeepSeekProvider(@Value("${ai.deepseek.api-key:}") String key,
                            @Value("${ai.deepseek.model:deepseek-flash}") String model,
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
        return "DEEPSEEK";
    }

    @Override
    public AIAnalysisResponse analyze(AIAnalysisRequest request) {
        if (!isAvailable()) {
            throw new IllegalStateException("DEEPSEEK_API_KEY não configurada");
        }

        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", JSON_PROMPT + "\n\n" + AnalysisInstructions.TEXT),
                            Map.of("role", "user", "content", request.context())),
                    "response_format", Map.of("type", "json_object"),
                    "thinking", Map.of("type", "disabled"),
                    "max_tokens", 4096);
            JsonNode response = callWithRetry(body);
            JsonNode content = response.at("/choices/0/message/content");
            if (!content.isTextual() || content.asText().isBlank()) {
                throw new IllegalStateException("DeepSeek retornou resposta em formato inesperado. Tente novamente.");
            }
            return normalize(content.asText());
        } catch (RestClientResponseException exception) {
            throw new IllegalStateException(failureMessage(exception.getStatusCode()), exception);
        } catch (RestClientException exception) {
            throw new IllegalStateException("Não foi possível conectar ao DeepSeek. Tente novamente mais tarde.", exception);
        } catch (IllegalStateException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("DeepSeek retornou resposta em formato inesperado. Tente novamente.", exception);
        }
    }

    private JsonNode callWithRetry(Map<String, Object> body) {
        for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                try {
                    Thread.sleep(2000L * attempt);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Análise interrompida.", exception);
                }
            }

            try {
                ResponseEntity<JsonNode> response = restClient.post()
                        .uri("/chat/completions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .toEntity(JsonNode.class);
                log.info("DeepSeek POST /chat/completions HTTP {}", response.getStatusCode().value());
                return response.getBody();
            } catch (RestClientResponseException exception) {
                if (exception.getStatusCode().value() != 503) {
                    throw exception;
                }
                if (attempt == MAX_RETRIES - 1) {
                    throw new IllegalStateException("DeepSeek está temporariamente indisponível. Tente novamente em alguns minutos.", exception);
                }
            }
        }
        throw new IllegalStateException("DeepSeek está temporariamente indisponível. Tente novamente em alguns minutos.");
    }

    static String failureMessage(org.springframework.http.HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> "DeepSeek recusou o formato da requisição.";
            case 401, 403 -> "DeepSeek recusou as credenciais. Verifique DEEPSEEK_API_KEY.";
            case 402 -> "DeepSeek não pôde processar a análise: saldo insuficiente.";
            case 429 -> "DeepSeek não pôde processar a análise: limite de uso excedido.";
            default -> "DeepSeek retornou erro HTTP " + status.value() + ". Tente novamente mais tarde.";
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
                .baseUrl("https://api.deepseek.com")
                .requestFactory(new HttpComponentsClientHttpRequestFactory(HttpClients.custom()
                        .setDefaultRequestConfig(requestConfig)
                        .setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create()
                                .setConnectionTimeToLive(TimeValue.ofSeconds(connectTimeoutSeconds))
                                .build())
                        .build()))
                .build();
    }
}
