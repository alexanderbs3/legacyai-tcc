package com.legacyai.dto;

import java.time.Instant;
import java.util.UUID;

import com.legacyai.entity.UploadedFile;

public record UploadedFileResponse(
    UUID id,
    String fileName,
    String fileType,
    long fileSize,
    Instant uploadedAt) {
    public static UploadedFileResponse from(UploadedFile f) {
        return new UploadedFileResponse(
            f.getId(),
            f.getFileName(),
            f.getFileType(),
            f.getFileSize(),
            f.getUploadedAt());
    }
}
