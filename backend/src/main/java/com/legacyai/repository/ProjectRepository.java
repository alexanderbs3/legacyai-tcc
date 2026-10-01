package com.legacyai.repository;
import com.legacyai.entity.Project;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;
public interface ProjectRepository extends JpaRepository<Project, UUID> {
 List<Project> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select project from Project project where project.id = :id")
 java.util.Optional<Project> findByIdForUpdate(@Param("id") UUID id);
}
