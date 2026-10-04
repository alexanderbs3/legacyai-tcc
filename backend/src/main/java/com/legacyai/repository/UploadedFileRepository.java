package com.legacyai.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.legacyai.entity.UploadedFile;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, UUID> {
    List<UploadedFile> findAllByProjectIdOrderByUploadedAtDesc(UUID projectId);

    @Query("""
        select coalesce(sum(file.fileSize), 0)
        from UploadedFile file
        where file.projectId in (select project.id from Project project where project.userId = :userId)
        """)
    long totalFileSizeByUserId(@Param("userId") UUID userId);
}
