package com.legacyai.ai.deepseek;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AIProvider;
import com.legacyai.ai.AnalysisInstructions;
import com.legacyai.ai.ReportPriority;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeepSeekProviderTest {
    private static final String REPORT = "{\"summary\":\"summary\",\"technologies\":[\"Java\"],\"architecture\":\"monolith\",\"problems\":[{\"title\":\"issue\",\"description\":\"detail\",\"priority\":\"HIGH\"}],\"securityRisks\":[],\"recommendations\":[],\"modernization\":[\"incremental\"]}";

    @Test
    void implementsProviderContractAndRequiresAKey() {
        DeepSeekProvider provider = new DeepSeekProvider("", "deepseek-flash");
        assertInstanceOf(AIProvider.class, provider);
        assertEquals("DEEPSEEK", provider.getProviderName());
        assertFalse(provider.isAvailable());
        assertThrows(IllegalStateException.class, () -> provider.analyze(new AIAnalysisRequest("project", "context")));
        assertTrue(new DeepSeekProvider("test-key", "deepseek-flash").isAvailable());
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void sendsSerializedRequestToOfficialEndpointWithoutExternalCall(CapturedOutput output) throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.deepseek.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        DeepSeekProvider provider = new DeepSeekProvider("test-key", "deepseek-flash");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        String response = "{\"choices\":[{\"message\":{\"content\":"
                + new ObjectMapper().writeValueAsString(REPORT) + "}}]}";
        server.expect(once(), requestTo("https://api.deepseek.com/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.model").value("deepseek-flash"))
                .andExpect(jsonPath("$.response_format.type").value("json_object"))
                .andExpect(jsonPath("$.thinking.type").value("disabled"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));

        assertEquals("summary", provider.analyze(new AIAnalysisRequest("project", "project context")).summary());
        assertTrue(output.getAll().contains("DeepSeek POST /chat/completions HTTP 200"));
        server.verify();
    }

    @Test
    void sendsChatCompletionWithOfficialModelAndParsesNormalizedReport() throws Exception {
        HttpMock http = new HttpMock();
        JsonNode response = new ObjectMapper().createObjectNode().set("choices", new ObjectMapper().readTree("""
                [{"message":{"content":"{\\"summary\\":\\"summary\\",\\"technologies\\":[\\"Java\\"],\\"architecture\\":\\"monolith\\",\\"problems\\":[{\\"title\\":\\"issue\\",\\"description\\":\\"detail\\",\\"priority\\":\\"HIGH\\"}],\\"securityRisks\\":[],\\"recommendations\\":[],\\"modernization\\":[\\"incremental\\"]}"}}]
                """));
        when(http.response.toEntity(JsonNode.class)).thenReturn(ResponseEntity.ok(response));

        AIAnalysisResponse report = http.provider.analyze(new AIAnalysisRequest("project", "project context"));

        assertEquals("summary", report.summary());
        assertEquals(List.of("Java"), report.technologies());
        assertEquals(ReportPriority.HIGH, report.problems().getFirst().priority());
        verify(http.post).uri("/chat/completions");
        verify(http.request).header(HttpHeaders.AUTHORIZATION, "Bearer test-key");
        verify(http.request).contentType(MediaType.APPLICATION_JSON);
        verify(http.request).accept(MediaType.APPLICATION_JSON);
        @SuppressWarnings("unchecked") org.mockito.ArgumentCaptor<Map<String, Object>> body = org.mockito.ArgumentCaptor.forClass(Map.class);
        verify(http.request).body(body.capture());
        assertEquals("deepseek-flash", body.getValue().get("model"));
        assertEquals(Map.of("type", "json_object"), body.getValue().get("response_format"));
        assertEquals(Map.of("type", "disabled"), body.getValue().get("thinking"));
        assertEquals(4096, body.getValue().get("max_tokens"));
        @SuppressWarnings("unchecked") List<Map<String, String>> messages = (List<Map<String, String>>) body.getValue().get("messages");
        assertEquals("system", messages.getFirst().get("role"));
        assertTrue(messages.getFirst().get("content").contains("JSON"));
        assertSharedQualityInstructions(messages.getFirst().get("content"));
        assertEquals(Map.of("role", "user", "content", "project context"), messages.get(1));
    }

    private static void assertSharedQualityInstructions(String prompt) {
        assertTrue(prompt.contains(AnalysisInstructions.TEXT));
        for (String requirement : List.of("português do Brasil (pt-BR)", "identificadores técnicos",
                "contexto efetivamente fornecido", "não significa que não existem no projeto",
                "INFERÊNCIA", "INFORMAÇÃO INSUFICIENTE", "HIGH", "lista vazia")) {
            assertTrue(prompt.contains(requirement), requirement);
        }
    }

    @Test
    void normalizesTextItemsAndPreservesObjects() throws Exception {
        String content = REPORT.replace("{\"title\":\"issue\",\"description\":\"detail\",\"priority\":\"HIGH\"}", "\"legacy issue\",{\"title\":\"issue\",\"description\":\"detail\",\"priority\":\"HIGH\"}");
        AIAnalysisResponse report = DeepSeekProvider.normalize(content);
        assertEquals(2, report.problems().size());
        assertEquals("legacy issue", report.problems().getFirst().description());
        assertEquals(ReportPriority.MEDIUM, report.problems().getFirst().priority());
        assertEquals(ReportPriority.HIGH, report.problems().get(1).priority());
    }

    @Test
    void reportsBalanceAndAuthenticationErrorsWithoutRetry() {
        HttpMock http = new HttpMock();
        when(http.response.toEntity(JsonNode.class)).thenThrow(new HttpClientErrorException(HttpStatus.PAYMENT_REQUIRED));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> http.provider.analyze(new AIAnalysisRequest("project", "context")));
        assertTrue(error.getMessage().contains("saldo"));
        assertInstanceOf(HttpClientErrorException.class, error.getCause());
        verify(http.response, times(1)).toEntity(JsonNode.class);
        assertTrue(DeepSeekProvider.failureMessage(HttpStatus.UNAUTHORIZED).contains("DEEPSEEK_API_KEY"));
        assertTrue(DeepSeekProvider.failureMessage(HttpStatus.TOO_MANY_REQUESTS).contains("limite"));
    }

    @Test
    void retriesOnlyOverloadThenReturnsTheReport() throws Exception {
        HttpMock http = new HttpMock();
        JsonNode response = new ObjectMapper().readTree("{\"choices\":[{\"message\":{\"content\":\"" + REPORT.replace("\"", "\\\"") + "\"}}]}");
        when(http.response.toEntity(JsonNode.class))
                .thenThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(ResponseEntity.ok(response));
        assertEquals("summary", http.provider.analyze(new AIAnalysisRequest("project", "context")).summary());
        verify(http.response, times(2)).toEntity(JsonNode.class);
    }

    @Test
    void reportsTemporaryUnavailabilityAfterThreeOverloads() {
        HttpMock http = new HttpMock();
        when(http.response.toEntity(JsonNode.class))
                .thenThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> http.provider.analyze(new AIAnalysisRequest("project", "context")));
        assertTrue(error.getMessage().contains("temporariamente indisponível"));
        verify(http.response, times(3)).toEntity(JsonNode.class);
    }

    private static class HttpMock {
        final RestClient restClient = mock(RestClient.class);
        final RestClient.RequestBodyUriSpec post = mock(RestClient.RequestBodyUriSpec.class);
        final RestClient.RequestBodySpec request = mock(RestClient.RequestBodySpec.class);
        final RestClient.ResponseSpec response = mock(RestClient.ResponseSpec.class);
        final DeepSeekProvider provider = new DeepSeekProvider("test-key", "deepseek-flash");

        HttpMock() {
            when(restClient.post()).thenReturn(post);
            when(post.uri(anyString())).thenReturn(request);
            when(request.header(eq(HttpHeaders.AUTHORIZATION), anyString())).thenReturn(request);
            when(request.contentType(MediaType.APPLICATION_JSON)).thenReturn(request);
            when(request.accept(MediaType.APPLICATION_JSON)).thenReturn(request);
            when(request.body(any(Object.class))).thenReturn(request);
            when(request.retrieve()).thenReturn(response);
            ReflectionTestUtils.setField(provider, "restClient", restClient);
        }
    }
}
