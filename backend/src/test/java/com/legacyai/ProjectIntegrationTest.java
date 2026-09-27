package com.legacyai;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.mock.web.MockMultipartFile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ProjectIntegrationTest {
    @Autowired private MockMvc mockMvc;

    @Test
    void createsAndListsOnlyAuthenticatedUsersProjects() throws Exception {
        String token = tokenFor("project-owner@example.com");

        mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Legacy billing\",\"description\":\"Mainframe migration\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Legacy billing"));

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Legacy billing"));
    }

    @Test
    void returns403WhenAnotherUserRequestsProject() throws Exception {
        String ownerToken = tokenFor("owner-2@example.com");
        String otherToken = tokenFor("other-2@example.com");
        MvcResult created = mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Private\",\"description\":\"\"}"))
                .andExpect(status().isCreated()).andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        mockMvc.perform(get("/api/projects/" + id).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void persistsMetadataForValidUploadAndRejectsInvalidExtension() throws Exception {
        String token = tokenFor("upload-owner@example.com");
        MvcResult project = mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Upload project\",\"description\":\"\"}"))
                .andExpect(status().isCreated()).andReturn();
        String id = JsonPath.read(project.getResponse().getContentAsString(), "$.id");
        mockMvc.perform(multipart("/api/projects/" + id + "/files").file(new MockMultipartFile("file", "README.md", "text/markdown", "# docs".getBytes())).header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.fileName").value("README.md"));
        mockMvc.perform(multipart("/api/projects/" + id + "/files").file(new MockMultipartFile("file", "malware.exe", "application/octet-stream", new byte[] {1})).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    private String tokenFor(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Project Owner\",\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.token");
    }
}
