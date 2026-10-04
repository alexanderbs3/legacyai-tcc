package com.legacyai.repository;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;

import com.legacyai.entity.AnalysisResult;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, UUID> {
    Optional<AnalysisResult> findByAnalysisId(UUID analysisId);
}
