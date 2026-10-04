package com.legacyai.dto;

import java.util.UUID;

public record CreateAnalysisResponse(UUID analysisId, String status) {
}
