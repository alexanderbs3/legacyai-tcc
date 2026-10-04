package com.legacyai.dto;

import java.util.List;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.ReportItem;
import com.legacyai.entity.AnalysisResult;

public record ReportResultResponse(
    String summary,
    List<String> technologies,
    String architecture,
    List<ReportItem> problems,
    List<ReportItem> securityRisks,
    List<ReportItem> recommendations,
    List<String> modernization) {
    public static ReportResultResponse from(AnalysisResult result, ObjectMapper json) {
        try {
            return new ReportResultResponse(
                result.getSummary(),
                json.readValue(result.getTechnologies(), new TypeReference<List<String>>() {
                }),
                result.getArchitecture(),
                json.readValue(result.getProblems(), new TypeReference<List<ReportItem>>() {
                }),
                json.readValue(result.getSecurityRisks(), new TypeReference<List<ReportItem>>() {
                }),
                json.readValue(result.getRecommendations(), new TypeReference<List<ReportItem>>() {
                }),
                json.readValue(result.getModernization(), new TypeReference<List<String>>() {
                }));
        } catch (Exception exception) {
            throw new IllegalStateException("Resultado de análise inválido", exception);
        }
    }
}
