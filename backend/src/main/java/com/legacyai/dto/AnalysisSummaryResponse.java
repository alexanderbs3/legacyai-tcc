package com.legacyai.dto;

import java.time.*;
import java.util.*;

import com.legacyai.entity.Analysis;

public record AnalysisSummaryResponse(
    UUID id,
    String provider,
    String status,
    Instant createdAt,
    Instant completedAt,
    String errorMessage) {
    public static AnalysisSummaryResponse from(Analysis a, String publicError) {
        return new AnalysisSummaryResponse(
            a.getId(),
            a.getProvider(),
            a.getStatus().name(),
            a.getCreatedAt(),
            a.getCompletedAt(),
            publicError);
    }
}
