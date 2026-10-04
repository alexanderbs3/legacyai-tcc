package com.legacyai;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;
import com.legacyai.entity.UploadedFile;
import com.legacyai.repository.UploadedFileRepository;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class UploadPersistenceFailureIntegrationTest {
    @TempDir
    static Path uploadDirectory;

    @DynamicPropertySource
    static void uploadProperties(DynamicPropertyRegistry registry) {
        registry.add("upload.temp-dir", () -> uploadDirectory.toString());
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UploadedFileRepository uploadedFiles;

    @Test
    void removesPhysicalUploadWhenMetadataPersistenceFails() throws Exception {
        String token = tokenFor("persistence-failure-" + UUID.randomUUID() + "@example.com");
        UUID projectId = createProject(token);
        when(uploadedFiles.totalFileSizeByUserId(any())).thenReturn(0L);
        when(uploadedFiles.save(any(UploadedFile.class)))
            .thenThrow(new IllegalStateException("database unavailable"));
        when(uploadedFiles.saveAndFlush(any(UploadedFile.class)))
            .thenThrow(new IllegalStateException("database unavailable"));

        assertThrows(
            Exception.class,
            () -> mockMvc
                .perform(
                    multipart("/api/projects/" + projectId + "/files")
                        .file(
                            new MockMultipartFile(
                                "file",
                                "README.md",
                                "text/markdown",
                                "# test".getBytes()))
                        .header("Authorization", "Bearer " + token)));

        try (var stored = Files.list(uploadDirectory)) {
            assertTrue(stored.findAny().isEmpty());
        }
    }

    private UUID createProject(String token) throws Exception {
        MvcResult project = mockMvc
            .perform(
                post("/api/projects")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content("{\"name\":\"Persistence\",\"description\":\"\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        return UUID.fromString(JsonPath.read(project.getResponse().getContentAsString(), "$.id"));
    }

    private String tokenFor(String email) throws Exception {
        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(APPLICATION_JSON)
                    .content(
                        "{\"name\":\"Persistence User\",\"email\":\"" + email
                            + "\",\"password\":\"secure-password\"}"))
            .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login").with(request -> {
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
