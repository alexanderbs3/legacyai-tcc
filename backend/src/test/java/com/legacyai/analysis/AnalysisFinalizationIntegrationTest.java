package com.legacyai.analysis;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisResult;
import com.legacyai.entity.AnalysisStatus;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.AnalysisResultRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

@SpringBootTest
@ActiveProfiles("test")
class AnalysisFinalizationIntegrationTest {
    @Autowired
    private AnalysisStateService state;

    @MockitoSpyBean
    private AnalysisRepository analyses;

    @Autowired
    private AnalysisResultRepository results;

    @AfterEach
    void cleanDatabase() {
        reset(analyses);
        results.deleteAll();
        analyses.deleteAll();
    }

    @Test
    void persistsResultAndCompletedStatusAtomically() {
        Analysis analysis = processingAnalysis();

        assertTrue(state.complete(analysis.getId(), resultFor(analysis.getId())));

        assertTrue(results.findByAnalysisId(analysis.getId()).isPresent());
        assertEquals(
            AnalysisStatus.COMPLETED,
            analyses.findById(analysis.getId()).orElseThrow().getStatus());
        state.fail(analysis.getId(), "late failure");
        assertEquals(
            AnalysisStatus.COMPLETED,
            analyses.findById(analysis.getId()).orElseThrow().getStatus());
    }

    @Test
    void rollsBackResultWhenStatusPersistenceFails() {
        Analysis analysis = processingAnalysis();
        doThrow(new IllegalStateException("database failure"))
            .when(analyses)
            .saveAndFlush(any(Analysis.class));

        assertThrows(
            IllegalStateException.class,
            () -> state.complete(analysis.getId(), resultFor(analysis.getId())));
        reset(analyses);

        assertFalse(results.findByAnalysisId(analysis.getId()).isPresent());
        assertEquals(
            AnalysisStatus.PROCESSING,
            analyses.findById(analysis.getId()).orElseThrow().getStatus());
    }

    private Analysis processingAnalysis() {
        Analysis analysis = new Analysis(UUID.randomUUID(), "OPENAI");
        analysis.processing();
        return analyses.save(analysis);
    }

    private AnalysisResult resultFor(UUID analysisId) {
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
