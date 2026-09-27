package com.legacyai.ai.claude;

import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.ReportPriority;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ClaudeProviderNormalizationTest {
    @Test
    void normalizesClaudeJsonToTheStandardReportSchema() throws Exception {
        AIAnalysisResponse report = ClaudeProvider.normalize("{\"summary\":\"summary\",\"technologies\":[\"Java\"],\"architecture\":\"monolith\",\"problems\":[{\"title\":\"p\",\"description\":\"d\",\"priority\":\"high\"}],\"securityRisks\":[],\"recommendations\":[],\"modernization\":[\"incremental\"]}");

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
