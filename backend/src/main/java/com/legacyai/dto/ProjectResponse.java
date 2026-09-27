package com.legacyai.dto;
import com.legacyai.entity.Project;
import java.time.Instant;
import java.util.UUID;
public record ProjectResponse(UUID id,String name,String description,Instant createdAt,Instant updatedAt){ public static ProjectResponse from(Project p){return new ProjectResponse(p.getId(),p.getName(),p.getDescription(),p.getCreatedAt(),p.getUpdatedAt());} }
