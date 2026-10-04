package com.legacyai.repository;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;

import com.legacyai.entity.Analysis;

public interface AnalysisRepository extends JpaRepository<Analysis, UUID> {
    List<Analysis> findAllByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
