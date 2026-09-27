package com.legacyai.dto;

import java.time.Instant;
import java.util.UUID;

public record AnalysisDetailResponse(UUID id, String provider, String status, Instant createdAt,
                                     Instant completedAt, String errorMessage, ReportResultResponse result) {}
