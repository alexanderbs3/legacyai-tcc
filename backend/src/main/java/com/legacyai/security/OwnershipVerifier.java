package com.legacyai.security;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.legacyai.exception.ForbiddenException;

@Component
public class OwnershipVerifier {

    public void verify(UUID resourceUserId, UUID authenticatedUserId) {
        if (!resourceUserId.equals(authenticatedUserId)) {
            throw new ForbiddenException();
        }
    }
}
