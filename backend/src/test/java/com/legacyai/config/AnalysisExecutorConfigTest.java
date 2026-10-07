package com.legacyai.config;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnalysisExecutorConfigTest {
    @Test
    void createsABoundedNamedExecutorForAnalysisWork() throws Exception {
        ThreadPoolTaskExecutor executor = new AnalysisExecutorConfig().analysisExecutor(1, 2, 3, 1);
        executor.initialize();
        try {
            CountDownLatch finished = new CountDownLatch(1);
            AtomicReference<String> threadName = new AtomicReference<>();
            executor.execute(() -> {
                threadName.set(Thread.currentThread().getName());
                finished.countDown();
            });

            assertTrue(finished.await(2, TimeUnit.SECONDS));
            assertTrue(threadName.get().startsWith("legacyai-analysis-"));
            assertEquals(1, executor.getCorePoolSize());
            assertEquals(2, executor.getMaxPoolSize());
            assertEquals(3, executor.getThreadPoolExecutor().getQueue().remainingCapacity());
        } finally {
            executor.destroy();
        }
    }
}
