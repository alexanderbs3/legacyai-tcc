package com.legacyai.analysis;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisStatus;
import com.legacyai.repository.AnalysisRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

@SpringBootTest
@ActiveProfiles("test")
class AnalysisJobRejectionIntegrationTest {
    @Autowired
    private AnalysisJobService jobs;

    @Autowired
    private AnalysisRepository analyses;

    @MockitoBean(name = "analysisExecutor")
    private ThreadPoolTaskExecutor executor;

    @AfterEach
    void cleanDatabase() {
        analyses.deleteAll();
    }

    @Test
    void saturationLeavesTheAnalysisInFailedInsteadOfPending() {
        Analysis analysis = analyses.save(new Analysis(UUID.randomUUID(), "OPENAI"));
        doThrow(new TaskRejectedException("saturated"))
            .when(executor)
            .execute(any(Runnable.class));

        assertFalse(jobs.dispatch(analysis.getId()));

        Analysis rejected = analyses.findById(analysis.getId()).orElseThrow();
        assertEquals(AnalysisStatus.FAILED, rejected.getStatus());
        assertNotNull(rejected.getCompletedAt());
        assertEquals(
            "Não foi possível concluir a análise. Tente novamente mais tarde.",
            rejected.getErrorMessage());
    }
}
