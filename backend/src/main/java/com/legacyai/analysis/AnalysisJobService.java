package com.legacyai.analysis;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AIProvider;
import com.legacyai.dto.ProviderResponse;
import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisResult;
import com.legacyai.entity.Project;
import com.legacyai.exception.InvalidFileException;
import com.legacyai.file.FileProcessor;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.ProjectRepository;
import com.legacyai.repository.UploadedFileRepository;

@Service
public class AnalysisJobService {
    private static final Logger log = LoggerFactory.getLogger(AnalysisJobService.class);

    private final ProjectRepository projects;

    private final UploadedFileRepository files;

    private final AnalysisRepository analyses;

    private final FileProcessor processor;

    private final AnalysisStateService state;

    private final TaskExecutor executor;

    private final ObjectMapper json;

    private final Map<String, AIProvider> providers = new HashMap<>();

    private final CountDownLatch recoveryFinished = new CountDownLatch(1);

    public AnalysisJobService(
        ProjectRepository projects,
        UploadedFileRepository files,
        AnalysisRepository analyses,
        FileProcessor processor,
        AnalysisStateService state,
        @Qualifier("analysisExecutor") TaskExecutor executor,
        ObjectMapper json,
        List<AIProvider> providerList) {
        this.projects = projects;
        this.files = files;
        this.analyses = analyses;
        this.processor = processor;
        this.state = state;
        this.executor = executor;
        this.json = json;
        providerList.forEach(provider -> providers.put(provider.getProviderName(), provider));
    }

    public boolean hasProvider(String provider) {
        return providers.containsKey(provider);
    }

    public List<ProviderResponse> providerList() {
        return providers
            .values()
            .stream()
            .map(
                provider -> new ProviderResponse(
                    provider.getProviderName(),
                    provider.getProviderName(),
                    provider.isAvailable()))
            .toList();
    }

    public void dispatchAfterRecovery(UUID analysisId) {
        try {
            recoveryFinished.await();
            dispatch(analysisId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            state.fail(analysisId, AnalysisService.publicFailureMessage(exception));
        }
    }

    public boolean dispatch(UUID analysisId) {
        if (!state.claimPending(analysisId)) {
            return false;
        }
        try {
            executor.execute(() -> process(analysisId));
            return true;
        } catch (TaskRejectedException exception) {
            log
                .error(
                    "Submissão da análise {} rejeitada pelo executor dedicado",
                    analysisId,
                    exception);
            state.fail(analysisId, AnalysisService.publicFailureMessage(exception));
            return false;
        }
    }

    public void recoveryFinished() {
        recoveryFinished.countDown();
    }

    private void process(UUID analysisId) {
        Analysis analysis = analyses.findById(analysisId).orElse(null);
        if (analysis == null) {
            return;
        }
        try {
            Project project = projects.findById(analysis.getProjectId()).orElseThrow();
            AIProvider provider = providers.get(analysis.getProvider());
            if (provider == null || !provider.isAvailable()) {
                throw new IllegalStateException("Provedor não configurado");
            }
            String context = processor
                .processFiles(
                    project,
                    files.findAllByProjectIdOrderByUploadedAtDesc(project.getId()));
            AIAnalysisResponse report = provider
                .analyze(new AIAnalysisRequest(project.getName(), context));
            state.complete(analysisId, result(analysisId, report));
        } catch (Exception exception) {
            logFailure(analysis, exception);
            state.fail(analysisId, AnalysisService.publicFailureMessage(exception));
        }
    }

    private AnalysisResult result(UUID analysisId, AIAnalysisResponse report) {
        return new AnalysisResult(
            analysisId,
            report.summary(),
            toJson(report.technologies()),
            report.architecture(),
            toJson(report.problems()),
            toJson(report.securityRisks()),
            toJson(report.recommendations()),
            toJson(report.modernization()));
    }

    private String toJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException(
                "Não foi possível persistir resultado normalizado",
                exception);
        }
    }

    private void logFailure(Analysis analysis, Exception exception) {
        Throwable cause = exception;
        while (cause.getCause() != null) {
            cause = cause.getCause();
        }
        if (cause instanceof RestClientResponseException http) {
            log
                .error(
                    "Análise {} falhou: provider={}, httpStatus={}, exception={}, message={}, cause={}",
                    analysis.getId(),
                    analysis.getProvider(),
                    http.getStatusCode().value(),
                    exception.getClass().getName(),
                    AnalysisService.publicFailureMessage(exception),
                    cause.getClass().getName());
        } else if (exception instanceof InvalidFileException && exception.getMessage() != null
            && AnalysisService.isSafeFailureMessage(exception.getMessage())
            && exception.getCause() == null) {
            log
                .error(
                    "Análise {} falhou: provider={}, httpStatus=n/a, exception={}, message={}, cause={}",
                    analysis.getId(),
                    analysis.getProvider(),
                    exception.getClass().getName(),
                    AnalysisService.publicFailureMessage(exception),
                    cause.getClass().getName(),
                    exception);
        } else {
            log
                .error(
                    "Análise {} falhou: provider={}, httpStatus=n/a, exception={}, message={}, cause={}",
                    analysis.getId(),
                    analysis.getProvider(),
                    exception.getClass().getName(),
                    AnalysisService.publicFailureMessage(exception),
                    cause.getClass().getName());
        }
    }
}
