package com.legacyai;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "logging.level.com.legacyai=INFO")
@ActiveProfiles({"test", "prod"})
@AutoConfigureMockMvc
class ProductionCorsIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void keepsThePlaceholderProductionOriginRestricted() throws Exception {
        mockMvc
            .perform(
                options("/api/auth/login")
                    .header("Origin", "http://localhost:5173")
                    .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));

        mockMvc
            .perform(
                options("/api/auth/login")
                    .header("Origin", "http://127.0.0.1:5173")
                    .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());

        mockMvc
            .perform(
                options("/api/auth/login")
                    .header("Origin", "http://localhost:5174")
                    .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());

        mockMvc
            .perform(
                options("/api/auth/login")
                    .header("Origin", "http://127.0.0.1:5174")
                    .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());
    }
}
