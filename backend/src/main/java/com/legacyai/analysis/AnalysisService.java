package com.legacyai.analysis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.legacyai.ai.AIAnalysisRequest;
import com.legacyai.ai.AIAnalysisResponse;
import com.legacyai.ai.AIProvider;
import com.legacyai.dto.AnalysisDetailResponse;
import com.legacyai.dto.AnalysisSummaryResponse;
import com.legacyai.dto.CreateAnalysisRequest;
import com.legacyai.dto.CreateAnalysisResponse;
import com.legacyai.dto.ProviderResponse;
import com.legacyai.dto.ReportResultResponse;
import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisResult;
import com.legacyai.entity.AnalysisStatus;
import com.legacyai.entity.Project;
import com.legacyai.exception.InvalidFileException;
import com.legacyai.exception.ResourceNotFoundException;
import com.legacyai.file.FileProcessor;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.AnalysisResultRepository;
import com.legacyai.repository.ProjectRepository;
import com.legacyai.repository.UploadedFileRepository;
import com.legacyai.security.OwnershipVerifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class AnalysisService {
    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);
    private static final String GENERIC_FAILURE = "Não foi possível concluir a análise. Tente novamente mais tarde.";
    private static final Set<String> SAFE_FAILURE_MESSAGES = Set.of(
            "Provedor não configurado",
            "Arquivo de texto deve estar em UTF-8. Converta o arquivo e tente novamente.",
            "O upload não contém arquivos de texto UTF-8 processáveis. Extraia o conteúdo de PDFs em TXT/MD ou inclua código-fonte.",
            "Caminho ZIP inválido",
            "OpenAI recusou as credenciais. Verifique OPENAI_API_KEY.",
            "OpenAI não pôde processar a análise: quota ou saldo insuficiente.",
            "OpenAI não pôde processar a análise: limite de requisições atingido. Tente novamente mais tarde.",
            "OpenAI retornou resposta incompatível com o relatório esperado. Tente novamente.",
            "Não foi possível conectar à OpenAI. Tente novamente mais tarde.",
            "Claude recusou as credenciais. Verifique ANTHROPIC_API_KEY.",
            "Claude não pôde processar a análise: limite de uso ou créditos esgotados.",
            "Não foi possível conectar ao Claude. Tente novamente mais tarde.",
            "DeepSeek recusou o formato da requisição.",
            "DeepSeek recusou as credenciais. Verifique DEEPSEEK_API_KEY.",
            "DeepSeek não pôde processar a análise: saldo insuficiente.",
            "DeepSeek não pôde processar a análise: limite de uso excedido.",
            "DeepSeek está temporariamente indisponível. Tente novamente em alguns minutos.",
            "DeepSeek retornou resposta em formato inesperado. Tente novamente.",
            "Não foi possível conectar ao DeepSeek. Tente novamente mais tarde.",
            "Análise interrompida.");
    private final ProjectRepository projects; private final UploadedFileRepository files;
    private final AnalysisRepository analyses; private final AnalysisResultRepository results;
    private final FileProcessor processor; private final Map<String, AIProvider> providers = new HashMap<>();
    private final OwnershipVerifier ownership; private final ObjectMapper json;
    public AnalysisService(ProjectRepository projects, UploadedFileRepository files, AnalysisRepository analyses,
      AnalysisResultRepository results, FileProcessor processor, List<AIProvider> providerList,
      OwnershipVerifier ownership, ObjectMapper json) { this.projects=projects; this.files=files; this.analyses=analyses; this.results=results; this.processor=processor; this.ownership=ownership; this.json=json; providerList.forEach(p->providers.put(p.getProviderName(),p)); }
    public CreateAnalysisResponse create(UUID userId, UUID projectId, CreateAnalysisRequest request) { Project project=owned(userId,projectId); String provider=Optional.ofNullable(request.provider()).filter(p->!p.equals("AUTO")).orElse("OPENAI"); if(!providers.containsKey(provider)) throw new InvalidFileException("Provedor indisponível"); if(files.findAllByProjectIdOrderByUploadedAtDesc(projectId).isEmpty()) throw new InvalidFileException("Adicione um arquivo ao projeto antes de iniciar a análise."); Analysis analysis=analyses.save(new Analysis(projectId,provider)); CompletableFuture.runAsync(()->process(analysis.getId(),project)); return new CreateAnalysisResponse(analysis.getId(),"PENDING"); }
    private void process(UUID analysisId, Project project) { Analysis analysis=analyses.findById(analysisId).orElseThrow(); try { analysis.processing(); analyses.save(analysis); AIProvider provider=providers.get(analysis.getProvider()); if(!provider.isAvailable()) throw new IllegalStateException("Provedor não configurado"); String context=processor.processFiles(project,files.findAllByProjectIdOrderByUploadedAtDesc(project.getId())); AIAnalysisResponse report=provider.analyze(new AIAnalysisRequest(project.getName(),context)); results.save(new AnalysisResult(analysisId,report.summary(),toJson(report.technologies()),report.architecture(),toJson(report.problems()),toJson(report.securityRisks()),toJson(report.recommendations()),toJson(report.modernization()))); analysis.completed(); analyses.save(analysis); } catch(Exception exception) { logFailure(analysis, exception); analysis.failed(publicFailureMessage(exception)); analyses.save(analysis); } }
    public List<AnalysisSummaryResponse> list(UUID userId, UUID projectId) { owned(userId,projectId); return analyses.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream().map(a -> AnalysisSummaryResponse.from(a, publicFailureMessage(a.getErrorMessage()))).toList(); }
    public AnalysisDetailResponse detail(UUID userId, UUID analysisId) { Analysis analysis=analyses.findById(analysisId).orElseThrow(ResourceNotFoundException::new); owned(userId,analysis.getProjectId()); ReportResultResponse result=analysis.getStatus()== AnalysisStatus.COMPLETED ? results.findByAnalysisId(analysisId).map(value->ReportResultResponse.from(value,json)).orElse(null) : null; return new AnalysisDetailResponse(analysis.getId(),analysis.getProjectId(),analysis.getProvider(),analysis.getStatus().name(),analysis.getCreatedAt(),analysis.getCompletedAt(),publicFailureMessage(analysis.getErrorMessage()),result); }
    @Transactional public void delete(UUID userId, UUID analysisId) { Analysis analysis=analyses.findById(analysisId).orElseThrow(ResourceNotFoundException::new); owned(userId,analysis.getProjectId()); results.findByAnalysisId(analysisId).ifPresent(results::delete); analyses.delete(analysis); }
    public List<ProviderResponse> providerList() { return providers.values().stream().map(p->new ProviderResponse(p.getProviderName(),p.getProviderName(),p.isAvailable())).toList(); }
    private Project owned(UUID userId, UUID projectId) { Project project=projects.findById(projectId).orElseThrow(ResourceNotFoundException::new); ownership.verify(project.getUserId(),userId); return project; }
    private String toJson(Object value) { try { return json.writeValueAsString(value); } catch(Exception exception) { throw new IllegalStateException("Não foi possível persistir resultado normalizado",exception); } }
    static String publicFailureMessage(Exception exception) {
        if (exception instanceof InvalidFileException || exception instanceof IllegalStateException) {
            return exception.getMessage() == null ? GENERIC_FAILURE : publicFailureMessage(exception.getMessage());
        }
        return GENERIC_FAILURE;
    }
    private static String publicFailureMessage(String message) {
        return message == null ? null : SAFE_FAILURE_MESSAGES.contains(message) ? message : GENERIC_FAILURE;
    }
    private void logFailure(Analysis analysis, Exception exception) {
        Throwable cause = exception;
        while (cause.getCause() != null) cause = cause.getCause();
        if (cause instanceof RestClientResponseException http) {
            log.error("Análise {} falhou: provider={}, httpStatus={}, exception={}, message={}, cause={}",
                    analysis.getId(), analysis.getProvider(), http.getStatusCode().value(),
                    exception.getClass().getName(), publicFailureMessage(exception), cause.getClass().getName());
        } else if (exception instanceof InvalidFileException && exception.getMessage() != null && SAFE_FAILURE_MESSAGES.contains(exception.getMessage()) && exception.getCause() == null) {
            log.error("Análise {} falhou: provider={}, httpStatus=n/a, exception={}, message={}, cause={}",
                    analysis.getId(), analysis.getProvider(), exception.getClass().getName(),
                    publicFailureMessage(exception), cause.getClass().getName(), exception);
        } else {
            log.error("Análise {} falhou: provider={}, httpStatus=n/a, exception={}, message={}, cause={}",
                    analysis.getId(), analysis.getProvider(), exception.getClass().getName(),
                    publicFailureMessage(exception), cause.getClass().getName());
        }
    }
}
