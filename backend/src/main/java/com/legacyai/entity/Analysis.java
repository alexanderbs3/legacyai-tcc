package com.legacyai.entity;

import jakarta.persistence.*;

import java.time.*;
import java.util.*;

@Entity
@Table(name = "analyses")
public class Analysis {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "project_id", nullable = false)
    private UUID projectId;
    @Column(name = "provider", nullable = false)
    private String provider;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AnalysisStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    protected Analysis() {
    }

    public Analysis(UUID projectId, String provider) {
        this.projectId = projectId;
        this.provider = provider;
        this.status = AnalysisStatus.PENDING;
    }

    @PrePersist
    void created() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public String getProvider() {
        return provider;
    }

    public AnalysisStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void processing() {
        status = AnalysisStatus.PROCESSING;
    }

    public void completed() {
        status = AnalysisStatus.COMPLETED;
        completedAt = Instant.now();
    }

    public void failed(String e) {
        status = AnalysisStatus.FAILED;
        errorMessage = e;
        completedAt = Instant.now();
    }
}
