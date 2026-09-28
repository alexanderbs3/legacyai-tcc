package com.legacyai.analysis;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"OPENAI_API_KEY=", "ai.deepseek.api-key="})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ProviderSelectionIntegrationTest {
    @Autowired private MockMvc mockMvc;

    @Test
    void rejectsAnalysisWithoutProjectFilesBeforeCreatingIt() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Empty Project\",\"email\":\"empty-analysis@example.com\",\"password\":\"secure-password\"}"))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .with(request -> { request.setRemoteAddr("198.51.100.202"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"empty-analysis@example.com\",\"password\":\"secure-password\"}"))
                .andExpect(status().isOk()).andReturn();
        String auth = "Bearer " + JsonPath.read(login.getResponse().getContentAsString(), "$.token");
        MvcResult project = mockMvc.perform(post("/api/projects")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"No material\"}"))
                .andExpect(status().isCreated()).andReturn();
        String projectId = JsonPath.read(project.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/projects/{id}/analyses", projectId)
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"provider\":\"OPENAI\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_FILE"));
        mockMvc.perform(get("/api/projects/{id}/analyses", projectId).header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void replacesGeminiWithDeepSeekWithoutChangingAutoFallback() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Provider Test\",\"email\":\"provider-selection@example.com\",\"password\":\"secure-password\"}"))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .with(request -> { request.setRemoteAddr("198.51.100.201"); return request; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"provider-selection@example.com\",\"password\":\"secure-password\"}"))
                .andExpect(status().isOk()).andReturn();
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.token");
        String auth = "Bearer " + token;
        MvcResult project = mockMvc.perform(post("/api/projects")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Provider test project\"}"))
                .andExpect(status().isCreated()).andReturn();
        String projectId = JsonPath.read(project.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/ai/providers").header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'DEEPSEEK')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.name == 'GEMINI')]").isEmpty())
                .andExpect(jsonPath("$[?(@.name == 'OPENAI')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.name == 'CLAUDE')]").isNotEmpty());

        mockMvc.perform(multipart("/api/projects/{id}/files", projectId)
                        .file(new MockMultipartFile("file", "sample.txt", "text/plain", "Exemplo de código".getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                        .header("Authorization", auth))
                .andExpect(status().isCreated());

        MvcResult selected = mockMvc.perform(post("/api/projects/{id}/analyses", projectId)
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"provider\":\"DEEPSEEK\"}"))
                .andExpect(status().isAccepted()).andReturn();
        String deepSeekAnalysisId = JsonPath.read(selected.getResponse().getContentAsString(), "$.analysisId");
        mockMvc.perform(get("/api/analyses/{id}", deepSeekAnalysisId).header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("DEEPSEEK"))
                .andExpect(jsonPath("$.projectId").value(projectId));

        MvcResult fallback = mockMvc.perform(post("/api/projects/{id}/analyses", projectId)
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"provider\":\"AUTO\"}"))
                .andExpect(status().isAccepted()).andReturn();
        String autoAnalysisId = JsonPath.read(fallback.getResponse().getContentAsString(), "$.analysisId");
        mockMvc.perform(get("/api/analyses/{id}", autoAnalysisId).header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("OPENAI"));
    }
}
