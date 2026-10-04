package com.legacyai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "uploaded_files")
public class UploadedFile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "temporary_path", nullable = false)
    private String temporaryPath;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    protected UploadedFile() {
    }

    public UploadedFile(
        UUID projectId,
        String fileName,
        String fileType,
        long fileSize,
        String temporaryPath) {
        this.projectId = projectId;
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.temporaryPath = temporaryPath;
    }

    @PrePersist
    void created() {
        uploadedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public String getTemporaryPath() {
        return temporaryPath;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
