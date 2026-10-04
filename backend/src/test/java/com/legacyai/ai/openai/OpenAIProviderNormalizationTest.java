package com.legacyai.ai.openai;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.ReportPriority;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenAIProviderNormalizationTest {
    @Test
    void parsesProviderJsonMatchingTheStandardReportSchema() throws Exception {
        AIAnalysisResponse report = OpenAIProvider
            .normalize(
                "{\"summary\":\"summary\",\"technologies\":[\"Java\"],\"architecture\":\"monolith\",\"problems\":[{\"title\":\"p\",\"description\":\"d\",\"priority\":\"HIGH\"}],\"securityRisks\":[],\"recommendations\":[],\"modernization\":[\"incremental\"]}");
        assertEquals("summary", report.summary());
        assertEquals(ReportPriority.HIGH, report.problems().getFirst().priority());
    }

    @Test
    void distinguishesQuotaFromRateLimit() {
        assertEquals(
            "OpenAI não pôde processar a análise: quota ou saldo insuficiente.",
            OpenAIProvider
                .failureMessage(HttpStatus.TOO_MANY_REQUESTS, "credit_balance_exhausted"));
        assertEquals(
            "OpenAI não pôde processar a análise: limite de requisições atingido. Tente novamente mais tarde.",
            OpenAIProvider.failureMessage(HttpStatus.TOO_MANY_REQUESTS, "rate_limit_exceeded"));
    }
}
