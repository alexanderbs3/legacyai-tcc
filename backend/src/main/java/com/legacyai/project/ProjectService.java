package com.legacyai.project;
import com.legacyai.dto.ProjectRequest; import com.legacyai.dto.ProjectResponse; import com.legacyai.entity.Project; import com.legacyai.exception.ResourceNotFoundException; import com.legacyai.repository.ProjectRepository; import com.legacyai.security.OwnershipVerifier; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import java.util.*;
@Service public class ProjectService { private final ProjectRepository projects; private final OwnershipVerifier ownership;
 public ProjectService(ProjectRepository projects, OwnershipVerifier ownership){this.projects=projects;this.ownership=ownership;}
 @Transactional(readOnly=true) public List<ProjectResponse> list(UUID userId){return projects.findAllByUserIdOrderByCreatedAtDesc(userId).stream().map(ProjectResponse::from).toList();}
 @Transactional public ProjectResponse create(UUID userId,ProjectRequest r){return ProjectResponse.from(projects.save(new Project(r.name().trim(), Optional.ofNullable(r.description()).orElse(""),userId)));}
 @Transactional(readOnly=true) public ProjectResponse get(UUID userId,UUID id){return ProjectResponse.from(owned(userId,id));}
 @Transactional public ProjectResponse update(UUID userId,UUID id,ProjectRequest r){Project p=owned(userId,id);p.update(r.name().trim(),Optional.ofNullable(r.description()).orElse(""));return ProjectResponse.from(p);}
 @Transactional public void delete(UUID userId,UUID id){projects.delete(owned(userId,id));}
 private Project owned(UUID userId,UUID id){Project p=projects.findById(id).orElseThrow(ResourceNotFoundException::new);ownership.verify(p.getUserId(),userId);return p;}}
