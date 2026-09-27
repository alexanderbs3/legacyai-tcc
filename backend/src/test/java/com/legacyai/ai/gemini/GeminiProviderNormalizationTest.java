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
    void isUnavailableWithoutApiKey() {
        assertFalse(new GeminiProvider("", "test").isAvailable());
    }
}
