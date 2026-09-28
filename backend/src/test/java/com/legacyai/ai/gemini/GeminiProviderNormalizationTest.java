package com.legacyai.ai.gemini;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.ReportPriority;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GeminiProviderNormalizationTest {
    @Test
    void normalizesGeminiJsonToTheStandardReportSchema() throws Exception {
        AIAnalysisResponse report = GeminiProvider.normalize("{\"summary\":\"summary\",\"technologies\":[\"Java\"],\"architecture\":\"monolith\",\"problems\":[{\"title\":\"p\",\"description\":\"d\",\"priority\":\"high\"}],\"securityRisks\":[],\"recommendations\":[],\"modernization\":[\"incremental\"]}");

        assertEquals("summary", report.summary());
        assertEquals(ReportPriority.HIGH, report.problems().getFirst().priority());
    }

    @Test
    void convertsStringReportItemsToMediumPriorityObjects() throws Exception {
        String problem = "p".repeat(81);
        String content = "{\"summary\":\"summary\",\"technologies\":[\"Java\"],\"architecture\":\"monolith\","
                + "\"problems\":[\"" + problem + "\"],\"securityRisks\":[\"risk\"],"
                + "\"recommendations\":[\"recommendation\"],\"modernization\":[\"incremental\"]}";

        AIAnalysisResponse report = GeminiProvider.normalize(content);

        assertEquals("p".repeat(80), report.problems().getFirst().title());
        assertEquals(problem, report.problems().getFirst().description());
        assertEquals(ReportPriority.MEDIUM, report.problems().getFirst().priority());
        assertEquals("risk", report.securityRisks().getFirst().title());
        assertEquals("risk", report.securityRisks().getFirst().description());
        assertEquals(ReportPriority.MEDIUM, report.securityRisks().getFirst().priority());
        assertEquals("recommendation", report.recommendations().getFirst().title());
        assertEquals(ReportPriority.MEDIUM, report.recommendations().getFirst().priority());
        assertEquals("Java", report.technologies().getFirst());
        assertEquals("incremental", report.modernization().getFirst());
    }

    @Test
    void isUnavailableWithoutApiKey() {
        assertFalse(new GeminiProvider("", "test").isAvailable());
    }

    @Test
    void retriesOnceAfterServiceUnavailableAndReturnsTheNormalizedResponse() throws Exception {
        RestClient restClient = mock(RestClient.class);
        RestClient.RequestBodyUriSpec post = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec request = mock(RestClient.RequestBodySpec.class);
        RestClient.ResponseSpec response = mock(RestClient.ResponseSpec.class);
        JsonNode successResponse = new ObjectMapper().readTree("""
                {"candidates":[{"content":{"parts":[{"text":"{\\"summary\\":\\"summary\\",\\"technologies\\":[\\"Java\\"],\\"architecture\\":\\"monolith\\",\\"problems\\":[],\\"securityRisks\\":[],\\"recommendations\\":[],\\"modernization\\":[]}"}]}}]}
                """);

        when(restClient.post()).thenReturn(post);
        when(post.uri(anyString(), any(), any())).thenReturn(request);
        when(request.contentType(MediaType.APPLICATION_JSON)).thenReturn(request);
        when(request.body(any(Object.class))).thenReturn(request);
        when(request.retrieve()).thenReturn(response);
        when(response.body(JsonNode.class))
                .thenThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(successResponse);

        GeminiProvider provider = new GeminiProvider("test-key", "test-model");
        Field restClientField = GeminiProvider.class.getDeclaredField("restClient");
        restClientField.setAccessible(true);
        restClientField.set(provider, restClient);

        AIAnalysisResponse report = provider.analyze(new AIAnalysisRequest("project", "context"));

        assertEquals("summary", report.summary());
        verify(response, times(2)).body(JsonNode.class);
    }
}
