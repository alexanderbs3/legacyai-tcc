package com.legacyai.ai.openai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

import java.util.List;
import java.util.Map;

@Component
public class OpenAIProvider implements AIProvider {
    private static final Logger log = LoggerFactory.getLogger(OpenAIProvider.class);
    private static final String INVALID_RESPONSE = "OpenAI retornou resposta incompatível com o relatório esperado. Tente novamente.";
    private static final String SYSTEM_PROMPT = """
            Analise o projeto e retorne um relatório no formato JSON especificado.
            """;
    private static final List<String> ITEM_SECTIONS = List.of("problems", "securityRisks", "recommendations");
    private static final List<String> REPORT_FIELDS = List.of("summary", "technologies", "architecture",
            "problems", "securityRisks", "recommendations", "modernization");
    private static final List<String> ITEM_FIELDS = List.of("title", "description", "priority");
    private static final List<String> PRIORITIES = List.of("HIGH", "MEDIUM", "LOW");
    private static final Map<String, Object> RESPONSE_FORMAT = Map.of(
            "type", "json_schema",
            "json_schema", Map.of("name", "legacyai_report", "strict", true, "schema", reportSchema()));
    private final String key;
    private final String model;
    private final RestClient restClient;
    private final ObjectMapper json = new ObjectMapper();

    public OpenAIProvider(String key, String model) {
        this.key = key;
        this.model = model;
        this.restClient = restClient(10, 90);
    }

    @Autowired
    public OpenAIProvider(@Value("${OPENAI_API_KEY:}") String key,
                          @Value("${openai.model:gpt-4.1-mini}") String model,
                          @Value("${ai.timeout.connect-seconds:10}") int connectTimeoutSeconds,
                          @Value("${ai.timeout.read-seconds:90}") int readTimeoutSeconds) {
        this.key = key;
        this.model = model;
        this.restClient = restClient(connectTimeoutSeconds, readTimeoutSeconds);
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
                            Map.of("role", "system", "content", SYSTEM_PROMPT + "\n" + AnalysisInstructions.TEXT),
                            Map.of("role", "user", "content", request.context())),
                    "response_format", RESPONSE_FORMAT);
            ResponseEntity<String> response = restClient.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + key)
                    .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().toEntity(String.class);
            JsonNode envelope = json.readTree(response.getBody());
            log.info("OpenAI POST /chat/completions HTTP {} model={} contentType={} finishReason={}",
                    response.getStatusCode().value(), model, response.getHeaders().getContentType(),
                    envelope.at("/choices/0/finish_reason").asText("n/a"));
            JsonNode choice = envelope.at("/choices/0");
            if (choice.at("/message/refusal").isTextual()) {
                throw new IllegalArgumentException("OpenAI recusou a geração do relatório");
            }
            if (!"stop".equals(choice.path("finish_reason").asText())) {
                throw new IllegalArgumentException("Resposta OpenAI incompleta ou interrompida (finish_reason="
                        + choice.path("finish_reason").asText("ausente") + ")");
            }
            JsonNode content = choice.at("/message/content");
            if (!content.isTextual() || content.asText().isBlank()) {
                throw new IllegalArgumentException("Resposta OpenAI sem conteúdo textual");
            }
            return normalize(content.asText());
        } catch (RestClientResponseException exception) {
            String code = errorCode(exception.getResponseBodyAsString());
            log.warn("OpenAI POST /chat/completions HTTP {} model={} errorCode={}",
                    exception.getStatusCode().value(), model, code);
            throw new IllegalStateException(failureMessage(exception.getStatusCode(), code), exception);
        } catch (ResourceAccessException exception) {
            throw new IllegalStateException("Não foi possível conectar à OpenAI. Tente novamente mais tarde.", exception);
        } catch (RestClientException | JsonProcessingException | IllegalArgumentException exception) {
            // Never expose provider content or Jackson's raw input in the persisted error message.
            throw new IllegalStateException(INVALID_RESPONSE,
                    new IllegalArgumentException(exception instanceof JsonProcessingException
                            ? "JSON inválido ou incompatível (" + exception.getClass().getSimpleName() + ")"
                            : exception.getMessage()));
        }
    }

    static String failureMessage(org.springframework.http.HttpStatusCode status, String code) {
        return switch (status.value()) {
            case 401, 403 -> "OpenAI recusou as credenciais. Verifique OPENAI_API_KEY.";
            case 429 -> List.of("insufficient_quota", "credit_balance_exhausted", "billing_hard_limit_reached",
                    "spend_limit_reached").contains(code)
                    ? "OpenAI não pôde processar a análise: quota ou saldo insuficiente."
                    : "OpenAI não pôde processar a análise: limite de requisições atingido. Tente novamente mais tarde.";
            default -> "OpenAI retornou erro HTTP " + status.value() + ". Tente novamente mais tarde.";
        };
    }

    private String errorCode(String body) {
        try {
            String code = json.readTree(body).at("/error/code").asText("");
            return code.matches("[a-z0-9_]{1,64}") ? code : "n/a";
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            return "n/a";
        }
    }

    static AIAnalysisResponse normalize(String content) throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(content);
        if (root == null || !root.isObject() || root.size() != REPORT_FIELDS.size()) {
            throw new IllegalArgumentException("Relatório deve ser objeto com as sete seções obrigatórias");
        }
        for (String field : List.of("summary", "architecture")) {
            if (!root.path(field).isTextual()) throw new IllegalArgumentException(field + " deve ser string");
        }
        for (String field : List.of("technologies", "modernization")) {
            JsonNode values = root.path(field);
            if (!values.isArray()) throw new IllegalArgumentException(field + " deve ser lista de strings");
            for (int i = 0; i < values.size(); i++) {
                if (!values.get(i).isTextual()) throw new IllegalArgumentException(field + "[" + i + "] deve ser string");
            }
        }
        for (String field : ITEM_SECTIONS) {
            JsonNode items = root.path(field);
            if (!items.isArray()) throw new IllegalArgumentException(field + " deve ser lista de objetos");
            for (int i = 0; i < items.size(); i++) {
                JsonNode item = items.get(i);
                if (!item.isObject() || item.size() != ITEM_FIELDS.size()
                        || !item.path("title").isTextual() || !item.path("description").isTextual()
                        || !item.path("priority").isTextual()
                        || !PRIORITIES.contains(item.path("priority").asText())) {
                    throw new IllegalArgumentException(field + "[" + i + "] deve conter title, description e priority (HIGH|MEDIUM|LOW)");
                }
            }
        }
        return mapper.treeToValue(root, AIAnalysisResponse.class);
    }

    private static Map<String, Object> reportSchema() {
        Map<String, Object> string = Map.of("type", "string");
        Map<String, Object> strings = Map.of("type", "array", "items", string);
        Map<String, Object> item = Map.of("type", "object", "properties", Map.of(
                "title", string, "description", string,
                "priority", Map.of("type", "string", "enum", PRIORITIES)),
                "required", ITEM_FIELDS, "additionalProperties", false);
        Map<String, Object> items = Map.of("type", "array", "items", item);
        return Map.of("type", "object", "properties", Map.of(
                "summary", string, "technologies", strings, "architecture", string,
                "problems", items, "securityRisks", items, "recommendations", items, "modernization", strings),
                "required", REPORT_FIELDS, "additionalProperties", false);
    }

    private static RestClient restClient(int connectTimeoutSeconds, int readTimeoutSeconds) {
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(connectTimeoutSeconds))
                .setResponseTimeout(Timeout.ofSeconds(readTimeoutSeconds))
                .build();
        return RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .requestFactory(new HttpComponentsClientHttpRequestFactory(HttpClients.custom()
                        .setDefaultRequestConfig(requestConfig)
                        .setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create()
                                .setConnectionTimeToLive(TimeValue.ofSeconds(connectTimeoutSeconds))
                                .build())
                        .build()))
                .build();
    }
}
