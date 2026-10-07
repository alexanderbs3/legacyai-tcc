package com.legacyai.repository;

import jakarta.persistence.LockModeType;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisStatus;

public interface AnalysisRepository extends JpaRepository<Analysis, UUID> {
    List<Analysis> findAllByProjectIdOrderByCreatedAtDesc(UUID projectId);

    List<Analysis> findAllByStatusInOrderByCreatedAtAsc(List<AnalysisStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select analysis from Analysis analysis where analysis.id = :id")
    Optional<Analysis> findByIdForUpdate(@Param("id") UUID id);
}
