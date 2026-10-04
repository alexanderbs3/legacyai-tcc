package com.legacyai.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank
    @Size(max = 100) String name,
    @NotBlank
    @Email
    @Size(max = 255) String email,
    @NotBlank
    @Size(min = 8, max = 128) String password) {
}
