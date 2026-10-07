package com.legacyai.analysis;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisResult;
import com.legacyai.entity.AnalysisStatus;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.AnalysisResultRepository;

@Service
public class AnalysisStateService {
    private final AnalysisRepository analyses;

    private final AnalysisResultRepository results;

    public AnalysisStateService(
        AnalysisRepository analyses,
        AnalysisResultRepository results) {
        this.analyses = analyses;
        this.results = results;
    }

    @Transactional
    public boolean claimPending(UUID analysisId) {
        Analysis analysis = analyses.findByIdForUpdate(analysisId).orElse(null);
        if (analysis == null || analysis.getStatus() != AnalysisStatus.PENDING) {
            return false;
        }
        analysis.processing();
        return true;
    }

    @Transactional
    public boolean complete(UUID analysisId, AnalysisResult result) {
        Analysis analysis = analyses.findByIdForUpdate(analysisId).orElse(null);
        if (analysis == null || analysis.getStatus() == AnalysisStatus.FAILED) {
            return false;
        }
        if (analysis.getStatus() == AnalysisStatus.COMPLETED) {
            return true;
        }
        if (analysis.getStatus() != AnalysisStatus.PROCESSING) {
            return false;
        }
        if (results.findByAnalysisId(analysisId).isEmpty()) {
            results.saveAndFlush(result);
        }
        analysis.completed();
        analyses.saveAndFlush(analysis);
        return true;
    }

    @Transactional
    public void fail(UUID analysisId, String publicMessage) {
        Analysis analysis = analyses.findByIdForUpdate(analysisId).orElse(null);
        if (analysis != null && (analysis.getStatus() == AnalysisStatus.PENDING
            || analysis.getStatus() == AnalysisStatus.PROCESSING)) {
            analysis.failed(publicMessage);
        }
    }

    @Transactional
    public List<UUID> prepareStartupRecovery() {
        List<Analysis> abandoned = analyses
            .findAllByStatusInOrderByCreatedAtAsc(
                List.of(AnalysisStatus.PENDING, AnalysisStatus.PROCESSING));
        for (Analysis analysis : abandoned) {
            if (results.findByAnalysisId(analysis.getId()).isPresent()) {
                analysis.completed();
            } else if (analysis.getStatus() == AnalysisStatus.PROCESSING) {
                analysis.retry();
            }
        }
        return abandoned
            .stream()
            .filter(analysis -> analysis.getStatus() == AnalysisStatus.PENDING)
            .map(Analysis::getId)
            .toList();
    }
}
