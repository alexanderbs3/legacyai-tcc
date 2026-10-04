package com.legacyai.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(strings = {"LegacyAI", "Projeto Legacy 2026", "Análise Java", "João Sistema 01"})
    void acceptsValidProjectNames(String name) {
        assertTrue(validator.validate(new ProjectRequest(name, "")).isEmpty());
    }

    @Test
    void acceptsProjectNameWithExactly150Utf16Units() {
        assertTrue(validator.validate(new ProjectRequest("Á".repeat(150), "")).isEmpty());
    }

    @Test
    void acceptsSupplementaryUnicodeLetterAt150Utf16Units() {
        String name = "\uD801\uDC00" + "A".repeat(148);
        assertEquals(150, name.length());
        assertTrue(validator.validate(new ProjectRequest(name, "")).isEmpty());
    }

    @ParameterizedTest
    @MethodSource("invalidProjectNames")
    void rejectsInvalidProjectNames(String name) {
        assertFalse(validator.validate(new ProjectRequest(name, "")).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"\tProjeto\t", "\nProjeto\n", "\rProjeto\r", "\u00A0Projeto\u00A0",
            "\"Projeto\""})
    void preservesAndRejectsNonAsciiSpacesControlsAndQuotes(String name) {
        ProjectRequest request = new ProjectRequest(name, "");
        assertEquals(name, request.name());
        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void reportsSpecificProjectNameFailures() {
        assertTrue(messagesFor("888888888").contains("O nome deve conter pelo menos uma letra."));
        assertTrue(
            messagesFor("Projeto@").contains("O nome deve usar apenas letras, números e espaços."));
    }

    @Test
    void normalizesProjectNameBeforeValidation() {
        ProjectRequest request = new ProjectRequest("   Projeto    Legacy   ", "");
        assertEquals("Projeto Legacy", request.name());
        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void validatesProjectDescriptionAt2000And2001Utf16Units() {
        assertTrue(validator.validate(new ProjectRequest("Project", "d".repeat(2000))).isEmpty());
        assertFalse(validator.validate(new ProjectRequest("Project", "d".repeat(2001))).isEmpty());
        assertTrue(validator.validate(new ProjectRequest("Project", "😀".repeat(1000))).isEmpty());
        assertFalse(
            validator.validate(new ProjectRequest("Project", "😀".repeat(1000) + "d")).isEmpty());
    }

    @Test
    void validatesRegistrationNameLimits() {
        assertTrue(
            validator
                .validate(new RegisterRequest("n".repeat(100), "name@example.com", "password"))
                .isEmpty());
        assertFalse(
            validator
                .validate(new RegisterRequest("n".repeat(101), "name@example.com", "password"))
                .isEmpty());
    }

    @Test
    void validatesRegistrationEmailLimits() {
        String maxEmail = "e".repeat(64) + "@" + "d".repeat(63) + "." + "d".repeat(63) + "."
            + "d".repeat(62);
        assertTrue(validator.validate(new RegisterRequest("Name", maxEmail, "password")).isEmpty());
        assertFalse(
            validator.validate(new RegisterRequest("Name", maxEmail + "d", "password")).isEmpty());
    }

    @Test
    void validatesRegistrationPasswordLimits() {
        assertTrue(
            validator
                .validate(new RegisterRequest("Name", "name@example.com", "p".repeat(8)))
                .isEmpty());
        assertTrue(
            validator
                .validate(new RegisterRequest("Name", "name@example.com", "p".repeat(128)))
                .isEmpty());
        assertFalse(
            validator
                .validate(new RegisterRequest("Name", "name@example.com", "p".repeat(7)))
                .isEmpty());
        assertFalse(
            validator
                .validate(new RegisterRequest("Name", "name@example.com", "p".repeat(129)))
                .isEmpty());
    }

    private Set<String> messagesFor(String name) {
        return validator
            .validate(new ProjectRequest(name, ""))
            .stream()
            .map(ConstraintViolation::getMessage)
            .collect(java.util.stream.Collectors.toSet());
    }

    private static Stream<String> invalidProjectNames() {
        return Stream
            .of(
                "",
                "  ",
                "ab",
                "888888888",
                "123",
                "Projeto@",
                "Projeto!",
                "Legacy_AI",
                "Legacy-AI",
                "~~ #'foo",
                "A".repeat(151));
    }
}
