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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    void normalizesNamesAndBlankDescriptionsOnCreateAndPut() throws Exception {
        String token = tokenFor("project-normalization@example.com");
        MvcResult created = mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  Legacy core  \",\"description\":\"   \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Legacy core"))
                .andExpect(jsonPath("$.description").value(""))
                .andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/projects/" + id).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  Renamed core  \",\"description\":\"\\t \\n\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed core"))
                .andExpect(jsonPath("$.description").value(""));

        mockMvc.perform(get("/api/projects/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed core"))
                .andExpect(jsonPath("$.description").value(""));

        mockMvc.perform(put("/api/projects/" + id).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + "n".repeat(151) + "\",\"description\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Requisição inválida"));
    }

    @Test
    void persistsMaximumDescriptionAndReturnsSafeValidationErrors() throws Exception {
        String token = tokenFor("project-boundaries@example.com");
        String name = "n".repeat(150);
        String description = "d".repeat(2000);
        mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  " + name + "  \",\"description\":\"" + description + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.description").value(description));

        mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Project\",\"description\":\"" + "d".repeat(2001) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Requisição inválida"));
    }

    @Test
    void putWithOmittedDescriptionClearsExistingValue() throws Exception {
        String token = tokenFor("project-put-omitted@example.com");
        MvcResult created = mockMvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"PUT project\",\"description\":\"Existing description\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/projects/" + id).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"PUT project renamed\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("PUT project renamed"))
                .andExpect(jsonPath("$.description").value(""));

        mockMvc.perform(get("/api/projects/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value(""));
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
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr("203.0.113." + (Math.floorMod(email.hashCode(), 240) + 10));
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secure-password\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.token");
    }
}
