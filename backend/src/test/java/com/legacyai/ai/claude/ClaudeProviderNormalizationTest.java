package com.legacyai.ai.claude;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AnalysisInstructions;
import com.legacyai.ai.ReportPriority;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ClaudeProviderNormalizationTest {
    @Test
    void sendsSharedQualityInstructionsWithProjectContext() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.anthropic.com");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ClaudeProvider provider = new ClaudeProvider("test-key", "test-model");
        ReflectionTestUtils.setField(provider, "restClient", builder.build());
        server
            .expect(requestTo("https://api.anthropic.com/v1/messages"))
            .andExpect(
                jsonPath("$.messages[0].content")
                    .value(
                        org.hamcrest.Matchers
                            .allOf(
                                org.hamcrest.Matchers.containsString("português do Brasil (pt-BR)"),
                                org.hamcrest.Matchers.containsString("identificadores técnicos"),
                                org.hamcrest.Matchers
                                    .containsString("contexto efetivamente fornecido"),
                                org.hamcrest.Matchers
                                    .containsString("não significa que não existem no projeto"),
                                org.hamcrest.Matchers.containsString("INFERÊNCIA"),
                                org.hamcrest.Matchers.containsString("INFORMAÇÃO INSUFICIENTE"),
                                org.hamcrest.Matchers.containsString("HIGH"),
                                org.hamcrest.Matchers.containsString("lista vazia"),
                                org.hamcrest.Matchers.containsString(AnalysisInstructions.TEXT),
                                org.hamcrest.Matchers.containsString("project context"))))
            .andRespond(
                withSuccess(
                    "{\"content\":[{\"text\":\"{\\\"summary\\\":\\\"resumo\\\",\\\"technologies\\\":[],\\\"architecture\\\":\\\"\\\",\\\"problems\\\":[],\\\"securityRisks\\\":[],\\\"recommendations\\\":[],\\\"modernization\\\":[]}\"}]}",
                    MediaType.APPLICATION_JSON));
        assertEquals(
            "resumo",
            provider
                .analyze(new com.legacyai.ai.AIAnalysisRequest("project", "project context"))
                .summary());
        server.verify();
    }

    @Test
    void normalizesClaudeJsonToTheStandardReportSchema() throws Exception {
        AIAnalysisResponse report = ClaudeProvider
            .normalize(
                "{\"summary\":\"summary\",\"technologies\":[\"Java\"],\"architecture\":\"monolith\",\"problems\":[{\"title\":\"p\",\"description\":\"d\",\"priority\":\"high\"}],\"securityRisks\":[],\"recommendations\":[],\"modernization\":[\"incremental\"]}");

        assertEquals("summary", report.summary());
        assertEquals(ReportPriority.HIGH, report.problems().getFirst().priority());
    }

    @Test
    void normalizesFencedJsonWithStringReportItems() throws Exception {
        String content = """
            ```json
            {
              "summary": "summary",
              "technologies": ["Java"],
              "architecture": "monolith",
              "problems": ["Missing tests"],
              "securityRisks": ["No authentication"],
              "recommendations": ["Add tests"],
              "modernization": ["incremental"]
            }
            ```
            """;

        AIAnalysisResponse report = ClaudeProvider.normalize(content);

        assertEquals("Missing tests", report.problems().getFirst().title());
        assertEquals("Missing tests", report.problems().getFirst().description());
        assertEquals(ReportPriority.MEDIUM, report.problems().getFirst().priority());
        assertEquals("No authentication", report.securityRisks().getFirst().description());
        assertEquals("Add tests", report.recommendations().getFirst().title());
    }

    @Test
    void isUnavailableWithoutApiKey() {
        assertFalse(new ClaudeProvider("", "test").isAvailable());
    }
}
