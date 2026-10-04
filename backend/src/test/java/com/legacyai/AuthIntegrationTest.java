package com.legacyai;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void registersUserWithoutExposingPasswordHash() throws Exception {
        mockMvc
            .perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {
                  "name": "Ada Lovelace",
                  "email": "ada@example.com",
                  "password": "secure-password"
                }
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.name").value("Ada Lovelace"))
            .andExpect(jsonPath("$.email").value("ada@example.com"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void logsInRegisteredUserWithBearerToken() throws Exception {
        String registration = """
            {
              "name": "Grace Hopper",
              "email": "grace@example.com",
              "password": "secure-password"
            }
            """;

        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(registration))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login").with(request -> {
            request.setRemoteAddr("203.0.113.10");
            return request;
        }).contentType(MediaType.APPLICATION_JSON).content("""
            {
              "email": "grace@example.com",
              "password": "secure-password"
            }
            """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.type").value("Bearer"));
    }

    @Test
    void signsLoginTokensWithHs256UsingTheUtf8Secret() throws Exception {
        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"JWT Test\",\"email\":\"jwt-test@example.com\",\"password\":\"secure-password\"}"))
            .andExpect(status().isCreated());

        MvcResult login = mockMvc.perform(post("/api/auth/login").with(request -> {
            request.setRemoteAddr("203.0.113.11");
            return request;
        })
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"jwt-test@example.com\",\"password\":\"secure-password\"}"))
            .andExpect(status().isOk())
            .andReturn();
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.token");

        var claims = Jwts
            .parser()
            .verifyWith(
                Keys
                    .hmacShaKeyFor(
                        "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
                            .getBytes(StandardCharsets.UTF_8)))
            .build()
            .parseSignedClaims(token);

        org.junit.jupiter.api.Assertions.assertEquals("HS256", claims.getHeader().getAlgorithm());
    }

}
