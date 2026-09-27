package com.legacyai.security;

import com.legacyai.exception.ForbiddenException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class OwnershipVerifier {

    public void verify(UUID resourceUserId, UUID authenticatedUserId) {
        if (!resourceUserId.equals(authenticatedUserId)) {
            throw new ForbiddenException();
        }
    }
}
