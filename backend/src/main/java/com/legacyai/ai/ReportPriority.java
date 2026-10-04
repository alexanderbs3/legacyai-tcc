package com.legacyai.ai;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ReportPriority {
    HIGH, MEDIUM, LOW;

    @JsonCreator
    public static ReportPriority from(String value) {
        try {
            return value == null ? MEDIUM : valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            return MEDIUM;
        }
    }
}
