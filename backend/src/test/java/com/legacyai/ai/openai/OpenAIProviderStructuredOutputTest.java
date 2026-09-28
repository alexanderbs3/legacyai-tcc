package com.legacyai.ai.openai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AnalysisInstructions;
import com.legacyai.ai.ReportPriority;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class OpenAIProviderStructuredOutputTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String REPORT = """
            {"summary":"O projeto usa Spring Boot.","technologies":["Java","Spring Boot"],
            "architecture":"ProductController chama ProductService.",
            "problems":[{"title":"Faltam testes","description":"ProductService não tem testes.","priority":"HIGH"}],
            "securityRisks":[{"title":"Risco de acesso","description":"Validar autenticação.","priority":"MEDIUM"}],
            "recommendations":[{"title":"Criar testes","description":"Testar ProductController.","priority":"LOW"}],
            "modernization":["Atualizar application.yml gradualmente."]}
            """;

    @Test
    void sendsTheCompleteReportSchemaAndParsesAllSevenSections() throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAIProvider provider = new OpenAIProvider("test-key", "gpt-4.1-mini");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        String envelope = JSON.writeValueAsString(JSON.readTree("""
                {"model":"gpt-4.1-mini","choices":[{"finish_reason":"stop","message":{"content":null}}]}
                """));
        JsonNode response = JSON.readTree(envelope);
        ((com.fasterxml.jackson.databind.node.ObjectNode) response.at("/choices/0/message"))
                .put("content", REPORT);
        server.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-key"))
                .andExpect(request -> {
                    JsonNode body = JSON.readTree(((org.springframework.mock.http.client.MockClientHttpRequest) request)
                            .getBodyAsString());
                    assertEquals("gpt-4.1-mini", body.path("model").asText());
                    assertEquals("json_schema", body.at("/response_format/type").asText());
                    assertTrue(body.at("/response_format/json_schema/strict").asBoolean());
                    JsonNode schema = body.at("/response_format/json_schema/schema");
                    assertEquals("object", schema.path("type").asText());
                    assertEquals(false, schema.path("additionalProperties").asBoolean());
                    Set<String> fields = Set.of("summary", "technologies", "architecture", "problems",
                            "securityRisks", "recommendations", "modernization");
                    assertEquals(fields, iterableSet(schema.path("properties").fieldNames()));
                    assertEquals(fields, iterableSet(schema.path("required").elements()));
                    for (String name : List.of("problems", "securityRisks", "recommendations")) {
                        JsonNode item = schema.path("properties").path(name).path("items");
                        assertEquals("object", item.path("type").asText());
                        assertEquals(false, item.path("additionalProperties").asBoolean());
                        assertEquals(Set.of("title", "description", "priority"), iterableSet(item.path("required").elements()));
                        assertEquals(Set.of("HIGH", "MEDIUM", "LOW"), iterableSet(item.at("/properties/priority/enum").elements()));
                    }
                    assertEquals("array", schema.at("/properties/technologies/type").asText());
                    assertEquals("string", schema.at("/properties/technologies/items/type").asText());
                    assertEquals("array", schema.at("/properties/modernization/type").asText());
                    assertEquals("string", schema.at("/properties/modernization/items/type").asText());
                    String system = body.at("/messages/0/content").asText();
                    assertTrue(system.contains(AnalysisInstructions.TEXT));
                    assertTrue(system.contains("português do Brasil"));
                    assertTrue(system.contains("identificadores técnicos originais presentes no contexto"));
                    for (String requirement : List.of("contexto efetivamente fornecido",
                            "não significa que não existem no projeto", "INFERÊNCIA", "INFORMAÇÃO INSUFICIENTE",
                            "HIGH", "lista vazia")) {
                        assertTrue(system.contains(requirement), requirement);
                    }
                    assertEquals("contexto ProductController", body.at("/messages/1/content").asText());
                })
                .andRespond(withSuccess(JSON.writeValueAsString(response), MediaType.APPLICATION_JSON));

        AIAnalysisResponse result = provider.analyze(new AIAnalysisRequest("Exemplo", "contexto ProductController"));
        assertEquals("O projeto usa Spring Boot.", result.summary());
        assertEquals(List.of("Java", "Spring Boot"), result.technologies());
        assertTrue(result.architecture().contains("ProductController"));
        assertEquals("Faltam testes", result.problems().getFirst().title());
        assertEquals(ReportPriority.HIGH, result.problems().getFirst().priority());
        assertEquals(ReportPriority.MEDIUM, result.securityRisks().getFirst().priority());
        assertEquals(ReportPriority.LOW, result.recommendations().getFirst().priority());
        assertTrue(result.modernization().getFirst().contains("application.yml"));
        server.verify();
    }

    @Test
    void stringInProblemsIsAResponseErrorNotAConnectionError() throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAIProvider provider = new OpenAIProvider("test-key", "gpt-4.1-mini");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        String invalid = REPORT.replace("{\"title\":\"Faltam testes\",\"description\":\"ProductService não tem testes.\",\"priority\":\"HIGH\"}",
                "\"Database connection configuration uses hardcoded credentials...\"");
        String response = "{\"choices\":[{\"finish_reason\":\"stop\",\"message\":{\"content\":"
                + JSON.writeValueAsString(invalid) + "}}]}";
        server.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> provider.analyze(new AIAnalysisRequest("Exemplo", "contexto")));
        assertTrue(error.getMessage().contains("resposta") && !error.getMessage().contains("conectar"));
        assertTrue(error.getCause().getMessage().contains("problems[0]"));
        server.verify();
    }

    @Test
    void rejectsTruncatedOutputInsteadOfParsingPartialContent() throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAIProvider provider = new OpenAIProvider("test-key", "gpt-4.1-mini");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        String response = "{\"choices\":[{\"finish_reason\":\"length\",\"message\":{\"content\":"
                + JSON.writeValueAsString(REPORT) + "}}]}";
        server.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> provider.analyze(new AIAnalysisRequest("Exemplo", "contexto")));
        assertTrue(error.getMessage().contains("resposta"));
        server.verify();
    }

    @Test
    void authenticationErrorIsNotReportedAsConnectionOrBillingFailure() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAIProvider provider = new OpenAIProvider("test-key", "gpt-4.1-mini");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        server.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":\"token_invalidated\"}}"));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> provider.analyze(new AIAnalysisRequest("Exemplo", "contexto")));
        assertTrue(error.getMessage().contains("credenciais"));
        assertInstanceOf(RestClientResponseException.class, error.getCause());
        server.verify();
    }

    @Test
    void quotaErrorIsReportedOnlyWhenTheApiSaysSo() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAIProvider provider = new OpenAIProvider("test-key", "gpt-4.1-mini");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        server.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":\"credit_balance_exhausted\"}}"));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> provider.analyze(new AIAnalysisRequest("Exemplo", "contexto")));
        assertTrue(error.getMessage().contains("saldo insuficiente"));
        assertInstanceOf(RestClientResponseException.class, error.getCause());
        server.verify();
    }

    @Test
    void refusesOutputWithoutTreatingItAsTransportFailure() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAIProvider provider = new OpenAIProvider("test-key", "gpt-4.1-mini");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        server.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess("{\"choices\":[{\"finish_reason\":\"stop\",\"message\":{\"refusal\":\"Not allowed\"}}]}",
                        MediaType.APPLICATION_JSON));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> provider.analyze(new AIAnalysisRequest("Exemplo", "contexto")));
        assertTrue(error.getMessage().contains("resposta") && !error.getMessage().contains("conectar"));
        server.verify();
    }

    @Test
    void rejectsMissingSectionsInsteadOfDefaultingThemToEmpty() {
        String missingProblems = REPORT.replace("\"problems\":[{\"title\":\"Faltam testes\",\"description\":\"ProductService não tem testes.\",\"priority\":\"HIGH\"}],", "");
        assertThrows(IllegalArgumentException.class, () -> OpenAIProvider.normalize(missingProblems));
    }

    private static Set<String> iterableSet(java.util.Iterator<?> values) {
        Set<String> result = new java.util.HashSet<>();
        values.forEachRemaining(value -> result.add(value instanceof JsonNode node ? node.asText() : (String) value));
        return result;
    }
}
