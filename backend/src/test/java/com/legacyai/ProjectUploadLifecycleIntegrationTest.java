package com.legacyai;

import com.jayway.jsonpath.JsonPath;
import com.legacyai.entity.UploadedFile;
import com.legacyai.repository.UploadedFileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ProjectUploadLifecycleIntegrationTest {
    @TempDir
    static Path uploadDirectory;

    @DynamicPropertySource
    static void uploadProperties(DynamicPropertyRegistry registry) {
        registry.add("upload.temp-dir", () -> uploadDirectory.toString());
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UploadedFileRepository uploadedFiles;

    @Test
    void deletesStoredBytesWhenProjectIsDeleted() throws Exception {
        String token = tokenFor("lifecycle-delete-" + UUID.randomUUID() + "@example.com");
        UUID projectId = createProject(token);
        UploadedFile upload = upload(projectId, token, "README.md", "# lifecycle");
        Path stored = Path.of(upload.getTemporaryPath());
        assertTrue(Files.exists(stored));

        mockMvc.perform(delete("/api/projects/" + projectId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertFalse(Files.exists(stored));
        assertTrue(uploadedFiles.findAllByProjectIdOrderByUploadedAtDesc(projectId).isEmpty());
    }

    @Test
    void deletesProjectWhenStoredFileWasAlreadyRemoved() throws Exception {
        String token = tokenFor("lifecycle-missing-" + UUID.randomUUID() + "@example.com");
        UUID projectId = createProject(token);
        UploadedFile upload = upload(projectId, token, "README.md", "# missing");
        Files.delete(Path.of(upload.getTemporaryPath()));

        mockMvc.perform(delete("/api/projects/" + projectId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertTrue(uploadedFiles.findAllByProjectIdOrderByUploadedAtDesc(projectId).isEmpty());
    }

    @Test
    void refusesManipulatedStoredPathWithoutDeletingFileOutsideUploadDirectory() throws Exception {
        String token = tokenFor("lifecycle-path-" + UUID.randomUUID() + "@example.com");
        UUID projectId = createProject(token);
        Path outside = Files.createTempFile("legacyai-outside-", ".txt");
        Files.writeString(outside, "must remain");
        uploadedFiles.save(new UploadedFile(projectId, "README.md", "text/markdown", 11, outside.toString()));

        mockMvc.perform(delete("/api/projects/" + projectId).header("Authorization", "Bearer " + token))
                .andExpect(status().is5xxServerError())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.error").value("STORAGE_ERROR"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("Não foi possível remover os arquivos do projeto."));

        assertTrue(Files.exists(outside));
        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    private UploadedFile upload(UUID projectId, String token, String name, String content) throws Exception {
        mockMvc.perform(multipart("/api/projects/" + projectId + "/files")
                        .file(new MockMultipartFile("file", name, "text/markdown", content.getBytes()))
                        .contentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());
        return uploadedFiles.findAllByProjectIdOrderByUploadedAtDesc(projectId).getFirst();
    }

    private UUID createProject(String token) throws Exception {
        MvcResult project = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content("{\"name\":\"Lifecycle\",\"description\":\"\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(JsonPath.read(project.getResponse().getContentAsString(), "$.id"));
    }

    private String tokenFor(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content("{\"name\":\"Lifecycle User\",\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr("203.0.113." + (Math.floorMod(email.hashCode(), 240) + 10));
                            return request;
                        })
                        .contentType(APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.token");
    }
}
