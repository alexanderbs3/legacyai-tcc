package com.legacyai.ai.gemini;

import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.ReportPriority;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

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
}
