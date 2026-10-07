package com.legacyai.analysis;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AnalysisRecoveryRunner implements ApplicationRunner {
    private final AnalysisStateService state;

    private final AnalysisJobService jobs;

    private final AtomicBoolean started = new AtomicBoolean();

    public AnalysisRecoveryRunner(AnalysisStateService state, AnalysisJobService jobs) {
        this.state = state;
        this.jobs = jobs;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        if (!started.compareAndSet(false, true)) {
            return;
        }
        List<UUID> pending;
        try {
            pending = state.prepareStartupRecovery();
        } finally {
            jobs.recoveryFinished();
        }
        pending.forEach(jobs::dispatch);
    }
}
