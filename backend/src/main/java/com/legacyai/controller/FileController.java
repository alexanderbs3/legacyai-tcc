package com.legacyai.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.legacyai.dto.UploadedFileResponse;
import com.legacyai.file.FileService;

@RestController
@RequestMapping("/api/projects")
public class FileController {
    private final FileService service;

    public FileController(FileService service) {
        this.service = service;
    }

    @GetMapping("/{projectId}/files")
    public java.util.List<UploadedFileResponse> list(
        @AuthenticationPrincipal UUID userId,
        @PathVariable UUID projectId) {
        return service.list(userId, projectId);
    }

    @PostMapping("/{projectId}/files")
    @ResponseStatus(HttpStatus.CREATED)
    public UploadedFileResponse upload(
        @AuthenticationPrincipal UUID userId,
        @PathVariable UUID projectId,
        @RequestParam("file") MultipartFile file) {
        return service.upload(userId, projectId, file);
    }
}
