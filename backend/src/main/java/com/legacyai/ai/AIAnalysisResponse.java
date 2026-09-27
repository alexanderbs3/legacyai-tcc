package com.legacyai.ai;

import java.util.List;

public record AIAnalysisResponse(
        String summary,
        List<String> technologies,
        String architecture,
        List<ReportItem> problems,
        List<ReportItem> securityRisks,
        List<ReportItem> recommendations,
        List<String> modernization) {
    public AIAnalysisResponse {
        summary = summary == null ? "" : summary;
        technologies = technologies == null ? List.of() : List.copyOf(technologies);
        architecture = architecture == null ? "" : architecture;
        problems = problems == null ? List.of() : List.copyOf(problems);
        securityRisks = securityRisks == null ? List.of() : List.copyOf(securityRisks);
        recommendations = recommendations == null ? List.of() : List.copyOf(recommendations);
        modernization = modernization == null ? List.of() : List.copyOf(modernization);
    }
}
