package com.legacyai.config;

import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class AnalysisExecutorConfig {
    @Bean(name = "analysisExecutor")
    ThreadPoolTaskExecutor analysisExecutor(
        @Value("${analysis.executor.core-pool-size:2}") int corePoolSize,
        @Value("${analysis.executor.max-pool-size:4}") int maxPoolSize,
        @Value("${analysis.executor.queue-capacity:20}") int queueCapacity,
        @Value("${analysis.executor.await-termination-seconds:30}") int awaitTerminationSeconds) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("legacyai-analysis-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(awaitTerminationSeconds);
        return executor;
    }
}
