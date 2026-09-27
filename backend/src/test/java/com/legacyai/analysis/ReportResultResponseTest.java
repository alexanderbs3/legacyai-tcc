package com.legacyai.analysis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.ReportItem;
import com.legacyai.ai.ReportPriority;
import com.legacyai.dto.ReportResultResponse;
import com.legacyai.entity.AnalysisResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReportResultResponseTest {
    @Test
    void readsEveryNormalizedReportFieldFromPersistence() throws Exception {
        ObjectMapper json = new ObjectMapper();
        AnalysisResult stored = new AnalysisResult(UUID.randomUUID(), "summary", json.writeValueAsString(List.of("Java")), "architecture",
                json.writeValueAsString(List.of(new ReportItem("problem", "description", ReportPriority.HIGH))),
                json.writeValueAsString(List.of(new ReportItem("risk", "description", ReportPriority.MEDIUM))),
                json.writeValueAsString(List.of(new ReportItem("recommendation", "description", ReportPriority.LOW))),
                json.writeValueAsString(List.of("modernize")));
        ReportResultResponse report = ReportResultResponse.from(stored, json);
        assertEquals("summary", report.summary()); assertEquals(List.of("Java"), report.technologies()); assertEquals("architecture", report.architecture());
        assertEquals(ReportPriority.HIGH, report.problems().getFirst().priority()); assertEquals(ReportPriority.MEDIUM, report.securityRisks().getFirst().priority());
        assertEquals(ReportPriority.LOW, report.recommendations().getFirst().priority()); assertEquals(List.of("modernize"), report.modernization());
    }
}
