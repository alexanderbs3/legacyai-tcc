package com.legacyai.controller;

import jakarta.validation.Valid;

import java.util.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.legacyai.dto.ProjectRequest;
import com.legacyai.dto.ProjectResponse;
import com.legacyai.project.ProjectService;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProjectResponse> list(@AuthenticationPrincipal UUID userId) {
        return service.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(
        @AuthenticationPrincipal UUID userId,
        @Valid
        @RequestBody ProjectRequest request) {
        return service.create(userId, request);
    }

    @GetMapping("/{id}")
    public ProjectResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return service.get(userId, id);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(
        @AuthenticationPrincipal UUID userId,
        @PathVariable UUID id,
        @Valid
        @RequestBody ProjectRequest request) {
        return service.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
    }
}
