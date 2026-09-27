package com.legacyai.security;

import com.legacyai.exception.ApiExceptionHandler;
import com.legacyai.exception.ForbiddenException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OwnershipVerifierTest {

    private final OwnershipVerifier ownershipVerifier = new OwnershipVerifier();

    @Test
    void returns403WhenAuthenticatedUserDoesNotOwnResource() {
        ForbiddenException exception = assertThrows(ForbiddenException.class, () ->
                ownershipVerifier.verify(UUID.randomUUID(), UUID.randomUUID()));

        assertEquals(HttpStatus.FORBIDDEN, new ApiExceptionHandler().handleForbidden(exception).getStatusCode());
    }
}
