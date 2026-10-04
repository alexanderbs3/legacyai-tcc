package com.legacyai;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "upload.max-total-size-per-user=10B")
@ActiveProfiles("test")
@AutoConfigureMockMvc
class UploadQuotaIntegrationTest {
    @TempDir
    static Path uploadDirectory;

    @DynamicPropertySource
    static void uploadProperties(DynamicPropertyRegistry registry) {
        registry.add("upload.temp-dir", () -> uploadDirectory.toString());
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rejectsUploadThatWouldExceedUsersTotalStorageAcrossProjects() throws Exception {
        String token = tokenFor("quota-" + UUID.randomUUID() + "@example.com");
        UUID firstProject = createProject(token, "First");
        UUID secondProject = createProject(token, "Second");

        upload(firstProject, token, "123456").andExpect(status().isCreated());
        upload(secondProject, token, "12345")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("INVALID_FILE"))
            .andExpect(
                jsonPath("$.message")
                    .value("O total de arquivos do usuário excede o limite permitido."));
    }

    @Test
    void serializesConcurrentUploadsForTheSameUsersQuotaAcrossProjects() throws Exception {
        String token = tokenFor("quota-concurrent-" + UUID.randomUUID() + "@example.com");
        UUID firstProject = createProject(token, "Concurrent First");
        UUID secondProject = createProject(token, "Concurrent Second");
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<Integer>> results = List
                .of(
                    executor.submit(() -> concurrentUpload(firstProject, token, ready, start)),
                    executor.submit(() -> concurrentUpload(secondProject, token, ready, start)));
            ready.await();
            start.countDown();

            List<Integer> statuses = List.of(results.get(0).get(), results.get(1).get());
            assertEquals(1, statuses.stream().filter(status -> status == 201).count());
            assertEquals(1, statuses.stream().filter(status -> status == 400).count());
        }
    }

    private int concurrentUpload(
        UUID projectId,
        String token,
        CountDownLatch ready,
        CountDownLatch start)
        throws Exception {
        ready.countDown();
        start.await();
        return upload(projectId, token, "123456").andReturn().getResponse().getStatus();
    }

    private org.springframework.test.web.servlet.ResultActions upload(
        UUID projectId,
        String token,
        String content)
        throws Exception {
        return mockMvc
            .perform(
                multipart("/api/projects/" + projectId + "/files")
                    .file(
                        new MockMultipartFile(
                            "file",
                            "README.md",
                            "text/markdown",
                            content.getBytes()))
                    .header("Authorization", "Bearer " + token));
    }

    private UUID createProject(String token, String name) throws Exception {
        MvcResult project = mockMvc
            .perform(
                post("/api/projects")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"description\":\"\"}"))
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
                        "{\"name\":\"Quota User\",\"email\":\"" + email
                            + "\",\"password\":\"secure-password\"}"))
            .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login").with(request -> {
            request.setRemoteAddr("198.51.100." + (Math.floorMod(email.hashCode(), 240) + 10));
            return request;
        })
            .contentType(APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
            .andExpect(status().isOk())
            .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.token");
    }
}
