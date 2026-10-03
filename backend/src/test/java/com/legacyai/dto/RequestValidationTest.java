package com.legacyai.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void validatesProjectNameAt150And151Utf16Units() {
        assertTrue(validator.validate(new ProjectRequest("n".repeat(150), "")).isEmpty());
        assertFalse(validator.validate(new ProjectRequest("n".repeat(151), "")).isEmpty());
        assertTrue(validator.validate(new ProjectRequest("😀".repeat(75), "")).isEmpty());
        assertFalse(validator.validate(new ProjectRequest("😀".repeat(75) + "n", "")).isEmpty());
    }

    @Test
    void normalizesProjectNameBeforeValidation() {
        ProjectRequest request = new ProjectRequest("  " + "n".repeat(150) + "\t", "");
        assertEquals("n".repeat(150), request.name());
        assertTrue(validator.validate(request).isEmpty());
        assertFalse(validator.validate(new ProjectRequest(" " + "n".repeat(151) + " ", "")).isEmpty());
    }

    @Test
    void validatesProjectDescriptionAt2000And2001Utf16Units() {
        assertTrue(validator.validate(new ProjectRequest("Project", "d".repeat(2000))).isEmpty());
        assertFalse(validator.validate(new ProjectRequest("Project", "d".repeat(2001))).isEmpty());
        assertTrue(validator.validate(new ProjectRequest("Project", "😀".repeat(1000))).isEmpty());
        assertFalse(validator.validate(new ProjectRequest("Project", "😀".repeat(1000) + "d")).isEmpty());
    }

    @Test
    void validatesRegistrationNameLimits() {
        assertTrue(validator.validate(new RegisterRequest("n".repeat(100), "name@example.com", "password")).isEmpty());
        assertFalse(validator.validate(new RegisterRequest("n".repeat(101), "name@example.com", "password")).isEmpty());
    }

    @Test
    void validatesRegistrationEmailLimits() {
        String maxEmail = "e".repeat(64) + "@" + "d".repeat(63) + "." + "d".repeat(63) + "." + "d".repeat(62);
        assertTrue(validator.validate(new RegisterRequest("Name", maxEmail, "password")).isEmpty());
        assertFalse(validator.validate(new RegisterRequest("Name", maxEmail + "d", "password")).isEmpty());
    }

    @Test
    void validatesRegistrationPasswordLimits() {
        assertTrue(validator.validate(new RegisterRequest("Name", "name@example.com", "p".repeat(8))).isEmpty());
        assertTrue(validator.validate(new RegisterRequest("Name", "name@example.com", "p".repeat(128))).isEmpty());
        assertFalse(validator.validate(new RegisterRequest("Name", "name@example.com", "p".repeat(7))).isEmpty());
        assertFalse(validator.validate(new RegisterRequest("Name", "name@example.com", "p".repeat(129))).isEmpty());
    }
}
