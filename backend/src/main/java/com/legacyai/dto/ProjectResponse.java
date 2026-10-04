package com.legacyai.dto;

import java.time.Instant;
import java.util.UUID;

import com.legacyai.entity.Project;

public record ProjectResponse(
    UUID id,
    String name,
    String description,
    Instant createdAt,
    Instant updatedAt) {
    public static ProjectResponse from(Project p) {
        return new ProjectResponse(
            p.getId(),
            p.getName(),
            p.getDescription(),
            p.getCreatedAt(),
            p.getUpdatedAt());
    }
}
