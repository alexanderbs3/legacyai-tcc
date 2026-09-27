package com.legacyai.ai.openai;

import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.ReportPriority;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenAIProviderNormalizationTest {
    @Test
    void normalizesProviderJsonToTheStandardReportSchema() throws Exception {
        AIAnalysisResponse report = OpenAIProvider.normalize("{\"summary\":\"summary\",\"technologies\":[\"Java\"],\"architecture\":\"monolith\",\"problems\":[{\"title\":\"p\",\"description\":\"d\",\"priority\":\"high\"}],\"securityRisks\":[],\"recommendations\":[],\"modernization\":[\"incremental\"]}");
        assertEquals("summary", report.summary());
        assertEquals(ReportPriority.HIGH, report.problems().getFirst().priority());
    }

    @Test
    void explainsThatOpenAICreditsAreExhausted() {
        assertEquals(
                "OpenAI não pôde processar a análise: limite de uso ou créditos esgotados.",
                OpenAIProvider.failureMessage(HttpStatus.TOO_MANY_REQUESTS));
    }
}
