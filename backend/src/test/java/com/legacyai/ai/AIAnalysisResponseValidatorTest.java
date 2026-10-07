package com.legacyai.ai;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AIAnalysisResponseValidatorTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String EMPTY_REPORT = """
        {"summary":"","technologies":[],"architecture":"","problems":[],
        "securityRisks":[],"recommendations":[],"modernization":[]}
        """;

    @Test
    void acceptsACompleteReportWithEmptyLists() throws Exception {
        assertDoesNotThrow(() -> AIAnalysisResponseValidator.validate(JSON.readTree(EMPTY_REPORT)));
    }

    @Test
    void rejectsEmptyObjectAndMissingSection() throws Exception {
        assertThrows(
            IllegalArgumentException.class,
            () -> AIAnalysisResponseValidator.validate(JSON.readTree("{}")));
        assertThrows(
            IllegalArgumentException.class,
            () -> AIAnalysisResponseValidator
                .validate(JSON.readTree(EMPTY_REPORT.replace(",\"modernization\":[]", ""))));
    }

    @Test
    void rejectsWrongSectionType() throws Exception {
        assertThrows(
            IllegalArgumentException.class,
            () -> AIAnalysisResponseValidator
                .validate(
                    JSON
                        .readTree(
                            EMPTY_REPORT.replace("\"technologies\":[]", "\"technologies\":{}"))));
    }

    @Test
    void rejectsIncompleteItemAndUnknownPriority() throws Exception {
        String item = "{\"title\":\"t\",\"description\":\"d\",\"priority\":\"HIGH\"}";
        assertThrows(
            IllegalArgumentException.class,
            () -> AIAnalysisResponseValidator
                .validate(
                    JSON
                        .readTree(
                            EMPTY_REPORT
                                .replace("\"problems\":[]", "\"problems\":[{\"title\":\"t\"}]"))));
        assertThrows(
            IllegalArgumentException.class,
            () -> AIAnalysisResponseValidator
                .validate(
                    JSON
                        .readTree(
                            EMPTY_REPORT
                                .replace(
                                    "\"problems\":[]",
                                    "\"problems\":[" + item.replace("HIGH", "CRITICAL") + "]"))));
    }
}
