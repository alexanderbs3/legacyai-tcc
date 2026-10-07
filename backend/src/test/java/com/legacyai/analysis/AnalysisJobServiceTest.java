package com.legacyai.analysis;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.file.FileProcessor;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.ProjectRepository;
import com.legacyai.repository.UploadedFileRepository;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnalysisJobServiceTest {
    @Test
    void rejectedSubmissionMovesTheClaimedAnalysisToFailed() {
        UUID analysisId = UUID.randomUUID();
        AnalysisStateService state = mock(AnalysisStateService.class);
        when(state.claimPending(analysisId)).thenReturn(true);
        TaskExecutor executor = task -> {
            throw new TaskRejectedException("saturated");
        };
        AnalysisJobService jobs = new AnalysisJobService(
            mock(ProjectRepository.class),
            mock(UploadedFileRepository.class),
            mock(AnalysisRepository.class),
            mock(FileProcessor.class),
            state,
            executor,
            new ObjectMapper(),
            List.of());

        assertFalse(jobs.dispatch(analysisId));

        verify(state).fail(eq(analysisId), any(String.class));
    }
}
