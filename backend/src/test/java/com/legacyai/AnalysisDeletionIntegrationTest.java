package com.legacyai;

import com.jayway.jsonpath.JsonPath;
import com.legacyai.entity.Analysis;
import com.legacyai.entity.AnalysisResult;
import com.legacyai.repository.AnalysisRepository;
import com.legacyai.repository.AnalysisResultRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AnalysisDeletionIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private AnalysisRepository analyses;
    @Autowired private AnalysisResultRepository results;

    @Test
    void deletesOwnedAnalysisAndItsResult() throws Exception {
        String token = tokenFor("analysis-delete-owner@example.com");
        UUID projectId = createProject(token);
        Analysis analysis = analyses.save(new Analysis(projectId, "OPENAI"));
        results.save(new AnalysisResult(analysis.getId(), "summary", "[]", "architecture", "[]", "[]", "[]", "[]"));

        mockMvc.perform(delete("/api/analyses/" + analysis.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertFalse(analyses.existsById(analysis.getId()));
        assertFalse(results.findByAnalysisId(analysis.getId()).isPresent());
    }

    @Test
    void returns403WhenAnotherUserDeletesAnAnalysis() throws Exception {
        String ownerToken = tokenFor("analysis-delete-owner-2@example.com");
        String otherToken = tokenFor("analysis-delete-other@example.com");
        Analysis analysis = analyses.save(new Analysis(createProject(ownerToken), "OPENAI"));

        mockMvc.perform(delete("/api/analyses/" + analysis.getId())
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    private UUID createProject(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Analysis deletion project\",\"description\":\"\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(JsonPath.read(result.getResponse().getContentAsString(), "$.id"));
    }

    private String tokenFor(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Analysis Owner\",\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.token");
    }
}
