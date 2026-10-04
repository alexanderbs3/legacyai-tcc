package com.legacyai.analysis;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;
import com.legacyai.entity.Analysis;
import com.legacyai.entity.UploadedFile;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.UploadedFileRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"ai.deepseek.api-key=diagnostic-key", "OPENAI_API_KEY="})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class AnalysisFailureLoggingIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UploadedFileRepository uploadedFiles;

    @Autowired
    private AnalysisRepository analyses;

    @Test
    void logsOriginalExceptionAndProviderWithoutLoggingAuthorization(CapturedOutput output)
        throws Exception {
        String email = "diagnostic-encoding-" + UUID.randomUUID() + "@example.com";
        String registration = "{\"name\":\"Diagnostic\",\"email\":\"" + email
            + "\",\"password\":\"test-password\"}";
        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(registration))
            .andExpect(status().isCreated());
        MvcResult login = mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"test-password\"}"))
            .andExpect(status().isOk())
            .andReturn();
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.token");
        MvcResult created = mockMvc
            .perform(
                post("/api/projects")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Arquivo inválido\",\"description\":\"\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        String projectId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        try {
            mockMvc
                .perform(
                    multipart("/api/projects/" + projectId + "/files")
                        .file(
                            new MockMultipartFile(
                                "file",
                                "invalid.txt",
                                "text/plain",
                                new byte[]{(byte) 0x80}))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());
            MvcResult analysis = mockMvc
                .perform(
                    post("/api/projects/" + projectId + "/analyses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"provider\":\"DEEPSEEK\"}"))
                .andExpect(status().isAccepted())
                .andReturn();
            String analysisId = JsonPath
                .read(analysis.getResponse().getContentAsString(), "$.analysisId");
            String current = "";
            for (int attempt = 0; attempt < 80; attempt++) {
                MvcResult detail = mockMvc
                    .perform(
                        get("/api/analyses/" + analysisId)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andReturn();
                current = JsonPath.read(detail.getResponse().getContentAsString(), "$.status");
                if (current.equals("FAILED"))
                    break;
                Thread.sleep(25);
            }
            assertEquals("FAILED", current);
            MvcResult safeDetail = mockMvc
                .perform(
                    get("/api/analyses/" + analysisId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
            assertEquals(
                "Arquivo de texto deve estar em UTF-8. Converta o arquivo e tente novamente.",
                JsonPath.read(safeDetail.getResponse().getContentAsString(), "$.errorMessage"));
            assertTrue(output.getAll().contains("provider=DEEPSEEK"));
            assertTrue(output.getAll().contains("InvalidFileException"));
            assertTrue(output.getAll().contains("FileProcessor.processFiles"));
            assertTrue(output.getAll().contains("Arquivo de texto deve estar em UTF-8"));
            assertTrue(!output.getAll().contains("Input length = 1"));
            assertTrue(!output.getAll().contains("diagnostic-key"));
            assertTrue(!output.getAll().contains("Authorization: Bearer"));
        } finally {
            for (var upload : uploadedFiles
                .findAllByProjectIdOrderByUploadedAtDesc(UUID.fromString(projectId))) {
                Files.deleteIfExists(Path.of(upload.getTemporaryPath()));
            }
        }
    }

    @Test
    void persistsGenericFailureWithoutExposingInternalPathInResponseOrLogs(CapturedOutput output)
        throws Exception {
        String email = "internal-failure-" + UUID.randomUUID() + "@example.com";
        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"Failure Test\",\"email\":\"" + email
                            + "\",\"password\":\"test-password\"}"))
            .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login").with(request -> {
            request.setRemoteAddr("198.51.100.231");
            return request;
        })
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"test-password\"}"))
            .andExpect(status().isOk())
            .andReturn();
        String auth = "Bearer "
            + JsonPath.read(login.getResponse().getContentAsString(), "$.token");
        MvcResult created = mockMvc
            .perform(
                post("/api/projects")
                    .header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Missing storage\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        String projectId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        String internalPath = "/hidden/storage/secret-file-" + UUID.randomUUID() + ".zip";
        uploadedFiles
            .save(
                new UploadedFile(
                    UUID.fromString(projectId),
                    "missing.zip",
                    "application/zip",
                    8,
                    internalPath));
        MvcResult analysis = mockMvc
            .perform(
                post("/api/projects/" + projectId + "/analyses")
                    .header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"provider\":\"DEEPSEEK\"}"))
            .andExpect(status().isAccepted())
            .andReturn();
        String analysisId = JsonPath
            .read(analysis.getResponse().getContentAsString(), "$.analysisId");
        String response = "";
        for (int attempt = 0; attempt < 80; attempt++) {
            MvcResult detail = mockMvc
                .perform(get("/api/analyses/" + analysisId).header("Authorization", auth))
                .andExpect(status().isOk())
                .andReturn();
            response = detail.getResponse().getContentAsString();
            if ("FAILED".equals(JsonPath.read(response, "$.status")))
                break;
            Thread.sleep(25);
        }
        assertEquals("FAILED", JsonPath.read(response, "$.status"));
        assertEquals(
            "Não foi possível concluir a análise. Tente novamente mais tarde.",
            JsonPath.read(response, "$.errorMessage"));
        assertFalse(response.contains(internalPath));
        assertTrue(output.getAll().contains("NoSuchFileException"));
        assertFalse(output.getAll().contains(internalPath));

        Analysis legacy = new Analysis(UUID.fromString(projectId), "DEEPSEEK");
        legacy.failed("internal-payload-never-expose");
        analyses.save(legacy);
        MvcResult legacyDetail = mockMvc
            .perform(get("/api/analyses/" + legacy.getId()).header("Authorization", auth))
            .andExpect(status().isOk())
            .andReturn();
        assertEquals(
            "Não foi possível concluir a análise. Tente novamente mais tarde.",
            JsonPath.read(legacyDetail.getResponse().getContentAsString(), "$.errorMessage"));
        MvcResult history = mockMvc
            .perform(get("/api/projects/" + projectId + "/analyses").header("Authorization", auth))
            .andExpect(status().isOk())
            .andReturn();
        assertFalse(
            history.getResponse().getContentAsString().contains("internal-payload-never-expose"));
    }

    @Test
    void preservesOnlyKnownSafeProviderAndFileMessages() {
        assertEquals(
            "OpenAI não pôde processar a análise: quota ou saldo insuficiente.",
            AnalysisService
                .publicFailureMessage(
                    new IllegalStateException(
                        "OpenAI não pôde processar a análise: quota ou saldo insuficiente.")));
        assertEquals(
            "DeepSeek recusou as credenciais. Verifique DEEPSEEK_API_KEY.",
            AnalysisService
                .publicFailureMessage(
                    new IllegalStateException(
                        "DeepSeek recusou as credenciais. Verifique DEEPSEEK_API_KEY.")));
        assertEquals(
            "O upload não contém arquivos de texto UTF-8 processáveis. Extraia o conteúdo de PDFs em TXT/MD ou inclua código-fonte.",
            AnalysisService
                .publicFailureMessage(
                    new com.legacyai.exception.InvalidFileException(
                        "O upload não contém arquivos de texto UTF-8 processáveis. Extraia o conteúdo de PDFs em TXT/MD ou inclua código-fonte.")));
        assertEquals(
            "O arquivo ZIP excede o limite de entradas permitidas.",
            AnalysisService
                .publicFailureMessage(
                    new com.legacyai.exception.InvalidFileException(
                        "O arquivo ZIP excede o limite de entradas permitidas.")));
        assertEquals(
            "O conteúdo descompactado do ZIP excede o limite permitido.",
            AnalysisService
                .publicFailureMessage(
                    new com.legacyai.exception.InvalidFileException(
                        "O conteúdo descompactado do ZIP excede o limite permitido.")));
        assertEquals(
            "Não foi possível concluir a análise. Tente novamente mais tarde.",
            AnalysisService.publicFailureMessage(new IllegalStateException("Authorization: ***")));
        assertEquals(
            "Não foi possível concluir a análise. Tente novamente mais tarde.",
            AnalysisService.publicFailureMessage(new IllegalStateException()));
    }
}
