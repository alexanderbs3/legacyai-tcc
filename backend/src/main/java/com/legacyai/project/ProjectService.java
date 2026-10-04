package com.legacyai.project;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.legacyai.dto.ProjectRequest;
import com.legacyai.dto.ProjectResponse;
import com.legacyai.entity.Project;
import com.legacyai.exception.ResourceNotFoundException;
import com.legacyai.file.FileService;
import com.legacyai.repository.ProjectRepository;
import com.legacyai.security.OwnershipVerifier;

@Service
public class ProjectService {
    private final ProjectRepository projects;

    private final OwnershipVerifier ownership;

    private final FileService fileService;

    public ProjectService(
        ProjectRepository projects,
        OwnershipVerifier ownership,
        FileService fileService) {
        this.projects = projects;
        this.ownership = ownership;
        this.fileService = fileService;
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(UUID userId) {
        return projects
            .findAllByUserIdOrderByCreatedAtDesc(userId)
            .stream()
            .map(ProjectResponse::from)
            .toList();
    }

    @Transactional
    public ProjectResponse create(UUID userId, ProjectRequest request) {
        return ProjectResponse
            .from(
                projects
                    .save(
                        new Project(
                            request.name(),
                            normalizedDescription(request.description()),
                            userId)));
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID userId, UUID id) {
        return ProjectResponse.from(owned(userId, id));
    }

    @Transactional
    public ProjectResponse update(UUID userId, UUID id, ProjectRequest request) {
        Project project = owned(userId, id);
        project.update(request.name(), normalizedDescription(request.description()));
        return ProjectResponse.from(project);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Project project = ownedForUpdate(userId, id);
        fileService.deleteStoredFilesForProject(id);
        projects.delete(project);
    }

    private Project ownedForUpdate(UUID userId, UUID id) {
        Project project = projects
            .findByIdForUpdate(id)
            .orElseThrow(ResourceNotFoundException::new);
        ownership.verify(project.getUserId(), userId);
        return project;
    }

    private Project owned(UUID userId, UUID id) {
        Project project = projects.findById(id).orElseThrow(ResourceNotFoundException::new);
        ownership.verify(project.getUserId(), userId);
        return project;
    }

    private String normalizedDescription(String description) {
        return description == null || description.isBlank() ? "" : description;
    }
}
