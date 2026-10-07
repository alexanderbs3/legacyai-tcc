package com.legacyai.analysis;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnalysisRecoveryRunnerTest {
    @Test
    void repeatedInvocationDoesNotDispatchTheSameRecoveryTwice() throws Exception {
        UUID analysisId = UUID.randomUUID();
        AnalysisStateService state = mock(AnalysisStateService.class);
        AnalysisJobService jobs = mock(AnalysisJobService.class);
        when(state.prepareStartupRecovery()).thenReturn(List.of(analysisId));
        AnalysisRecoveryRunner runner = new AnalysisRecoveryRunner(state, jobs);
        DefaultApplicationArguments arguments = new DefaultApplicationArguments(new String[0]);

        runner.run(arguments);
        runner.run(arguments);

        verify(state, times(1)).prepareStartupRecovery();
        verify(jobs, times(1)).recoveryFinished();
        verify(jobs, times(1)).dispatch(analysisId);
    }
}
