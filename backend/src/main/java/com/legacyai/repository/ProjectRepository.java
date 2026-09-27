package com.legacyai.repository;
import com.legacyai.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface ProjectRepository extends JpaRepository<Project, UUID> { List<Project> findAllByUserIdOrderByCreatedAtDesc(UUID userId); }
