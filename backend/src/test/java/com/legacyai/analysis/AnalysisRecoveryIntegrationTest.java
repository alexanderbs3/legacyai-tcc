package com.legacyai.analysis;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisResult;
import com.legacyai.entity.AnalysisStatus;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.AnalysisResultRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class AnalysisRecoveryIntegrationTest {
    @Autowired
    private AnalysisStateService state;

    @Autowired
    private AnalysisRepository analyses;

    @Autowired
    private AnalysisResultRepository results;

    @AfterEach
    void cleanDatabase() {
        results.deleteAll();
        analyses.deleteAll();
    }

    @Test
    void recoversPendingAndProcessingWhileIgnoringTerminalAnalyses() {
        Analysis pending = analyses.save(new Analysis(UUID.randomUUID(), "OPENAI"));
        Analysis processing = new Analysis(UUID.randomUUID(), "OPENAI");
        processing.processing();
        analyses.save(processing);
        Analysis processingWithResult = new Analysis(UUID.randomUUID(), "OPENAI");
        processingWithResult.processing();
        analyses.save(processingWithResult);
        results.save(emptyResult(processingWithResult.getId()));
        Analysis completed = new Analysis(UUID.randomUUID(), "OPENAI");
        completed.processing();
        completed.completed();
        analyses.save(completed);
        Analysis failed = new Analysis(UUID.randomUUID(), "OPENAI");
        failed.failed("safe");
        analyses.save(failed);

        List<UUID> recovered = state.prepareStartupRecovery();

        assertEquals(List.of(pending.getId(), processing.getId()), recovered);
        assertEquals(
            AnalysisStatus.PENDING,
            analyses.findById(pending.getId()).orElseThrow().getStatus());
        assertEquals(
            AnalysisStatus.PENDING,
            analyses.findById(processing.getId()).orElseThrow().getStatus());
        assertEquals(
            AnalysisStatus.COMPLETED,
            analyses.findById(processingWithResult.getId()).orElseThrow().getStatus());
        assertEquals(
            AnalysisStatus.COMPLETED,
            analyses.findById(completed.getId()).orElseThrow().getStatus());
        assertEquals(
            AnalysisStatus.FAILED,
            analyses.findById(failed.getId()).orElseThrow().getStatus());
        assertTrue(results.findByAnalysisId(processingWithResult.getId()).isPresent());
    }

    private AnalysisResult emptyResult(UUID analysisId) {
        return new AnalysisResult(
            analysisId,
            "summary",
            "[]",
            "architecture",
            "[]",
            "[]",
            "[]",
            "[]");
    }
}
