package com.legacyai.analysis;

import com.jayway.jsonpath.JsonPath;
import com.legacyai.repository.UploadedFileRepository;
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

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
    @Autowired private MockMvc mockMvc;
    @Autowired private UploadedFileRepository uploadedFiles;

    @Test
    void logsOriginalExceptionAndProviderWithoutLoggingAuthorization(CapturedOutput output) throws Exception {
        String email = "diagnostic-encoding-" + UUID.randomUUID() + "@example.com";
        String registration = "{\"name\":\"Diagnostic\",\"email\":\"" + email + "\",\"password\":\"test-password\"}";
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registration))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"test-password\"}"))
                .andExpect(status().isOk()).andReturn();
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.token");
        MvcResult created = mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Arquivo inválido\",\"description\":\"\"}"))
                .andExpect(status().isCreated()).andReturn();
        String projectId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        try {
            mockMvc.perform(multipart("/api/projects/" + projectId + "/files")
                            .file(new MockMultipartFile("file", "invalid.txt", "text/plain", new byte[] {(byte) 0x80}))
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isCreated());
            MvcResult analysis = mockMvc.perform(post("/api/projects/" + projectId + "/analyses")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"provider\":\"DEEPSEEK\"}"))
                    .andExpect(status().isAccepted()).andReturn();
            String analysisId = JsonPath.read(analysis.getResponse().getContentAsString(), "$.analysisId");
            String current = "";
            for (int attempt = 0; attempt < 80; attempt++) {
                MvcResult detail = mockMvc.perform(get("/api/analyses/" + analysisId)
                                .header("Authorization", "Bearer " + token))
                        .andExpect(status().isOk()).andReturn();
                current = JsonPath.read(detail.getResponse().getContentAsString(), "$.status");
                if (current.equals("FAILED")) break;
                Thread.sleep(25);
            }
            assertEquals("FAILED", current);
            assertTrue(output.getAll().contains("provider=DEEPSEEK"));
            assertTrue(output.getAll().contains("InvalidFileException"));
            assertTrue(output.getAll().contains("FileProcessor.processFiles"));
            assertTrue(output.getAll().contains("Arquivo de texto deve estar em UTF-8"));
            assertTrue(!output.getAll().contains("Input length = 1"));
            assertTrue(!output.getAll().contains("diagnostic-key"));
            assertTrue(!output.getAll().contains("Authorization: Bearer"));
        } finally {
            for (var upload : uploadedFiles.findAllByProjectIdOrderByUploadedAtDesc(UUID.fromString(projectId))) {
                Files.deleteIfExists(Path.of(upload.getTemporaryPath()));
            }
        }
    }
}
