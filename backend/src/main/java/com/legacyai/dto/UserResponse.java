package com.legacyai.dto;

import java.time.Instant;
import java.util.UUID;

import com.legacyai.entity.User;

public record UserResponse(UUID id, String name, String email, Instant createdAt) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}
