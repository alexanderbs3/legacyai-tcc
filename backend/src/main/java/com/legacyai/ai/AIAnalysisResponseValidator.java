package com.legacyai.ai;

import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;

public final class AIAnalysisResponseValidator {
    private static final Set<String> REPORT_FIELDS = Set
        .of(
            "summary",
            "technologies",
            "architecture",
            "problems",
            "securityRisks",
            "recommendations",
            "modernization");

    private static final Set<String> ITEM_FIELDS = Set.of("title", "description", "priority");

    private static final Set<String> PRIORITIES = Set.of("HIGH", "MEDIUM", "LOW");

    private AIAnalysisResponseValidator() {
    }

    public static void validate(JsonNode root) {
        if (root == null || !root.isObject() || !fields(root).equals(REPORT_FIELDS)) {
            throw new IllegalArgumentException(
                "Relatório deve ser objeto com as sete seções obrigatórias");
        }
        requireText(root, "summary");
        requireText(root, "architecture");
        requireStringList(root, "technologies");
        requireStringList(root, "modernization");
        requireItemList(root, "problems");
        requireItemList(root, "securityRisks");
        requireItemList(root, "recommendations");
    }

    private static void requireText(JsonNode root, String field) {
        if (!root.get(field).isTextual()) {
            throw new IllegalArgumentException(field + " deve ser string");
        }
    }

    private static void requireStringList(JsonNode root, String field) {
        JsonNode values = root.get(field);
        if (!values.isArray()) {
            throw new IllegalArgumentException(field + " deve ser lista de strings");
        }
        for (int index = 0; index < values.size(); index++) {
            if (!values.get(index).isTextual()) {
                throw new IllegalArgumentException(field + "[" + index + "] deve ser string");
            }
        }
    }

    private static void requireItemList(JsonNode root, String field) {
        JsonNode items = root.get(field);
        if (!items.isArray()) {
            throw new IllegalArgumentException(field + " deve ser lista de objetos");
        }
        for (int index = 0; index < items.size(); index++) {
            JsonNode item = items.get(index);
            if (!item.isObject() || !fields(item).equals(ITEM_FIELDS)
                || !item.get("title").isTextual() || !item.get("description").isTextual()
                || !item.get("priority").isTextual()
                || !PRIORITIES.contains(item.get("priority").asText())) {
                throw new IllegalArgumentException(
                    field + "[" + index
                        + "] deve conter title, description e priority (HIGH|MEDIUM|LOW)");
            }
        }
    }

    private static Set<String> fields(JsonNode node) {
        Set<String> fields = new java.util.HashSet<>();
        node.fieldNames().forEachRemaining(fields::add);
        return fields;
    }
}
