package com.legacyai.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.legacyai.dto.AuthResponse;
import com.legacyai.dto.LoginRequest;
import com.legacyai.dto.RegisterRequest;
import com.legacyai.dto.UserResponse;
import com.legacyai.service.AuthService;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(
        @Valid
        @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
        @Valid
        @RequestBody LoginRequest request,
        HttpServletRequest servletRequest) {
        if (!resolveBucket(servletRequest.getRemoteAddr()).tryConsume(1)) {
            return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", "300")
                .body(
                    Map
                        .of(
                            "error",
                            "RATE_LIMIT",
                            "message",
                            "Muitas tentativas. Aguarde 5 minutos."));
        }
        return ResponseEntity.ok(authService.login(request));
    }

    private Bucket resolveBucket(String ip) {
        return buckets
            .computeIfAbsent(
                ip,
                ignored -> Bucket
                    .builder()
                    .addLimit(
                        Bandwidth
                            .builder()
                            .capacity(5)
                            .refillIntervally(5, Duration.ofMinutes(5))
                            .build())
                    .build());
    }
}
