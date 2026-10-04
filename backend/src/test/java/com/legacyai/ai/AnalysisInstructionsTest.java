package com.legacyai.ai;

import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AnalysisInstructionsTest {
    @Test
    void definesEvidenceBasedCriteriaForAllSevenSections() {
        String instructions = AnalysisInstructions.TEXT;
        for (String section : List
            .of(
                "summary:",
                "technologies:",
                "architecture:",
                "problems:",
                "securityRisks:",
                "recommendations:",
                "modernization:")) {
            assertTrue(instructions.contains(section), section);
        }
        for (String requirement : List
            .of(
                "português do Brasil (pt-BR)",
                "identificadores técnicos",
                "somente no contexto efetivamente fornecido",
                "EVIDÊNCIA OBSERVADA",
                "INFERÊNCIA",
                "INFORMAÇÃO INSUFICIENTE",
                "não significa que não existem no projeto",
                "HIGH para impacto grave",
                "MEDIUM para impacto relevante",
                "LOW para melhoria localizada",
                "lista vazia em problems, securityRisks",
                "recommendations ou modernization")) {
            assertTrue(instructions.contains(requirement), requirement);
        }
    }

    @Test
    void keepsInsufficientInformationOutOfFindingsAndSpeculativeActions() {
        String instructions = AnalysisInstructions.TEXT.replaceAll("\\s+", " ");
        for (String requirement : List
            .of(
                "Informação insuficiente é uma limitação da análise, não um achado",
                "A ausência no contexto não significa ausência no projeto",
                "problems: inclua apenas problemas positivamente sustentados por evidência",
                "securityRisks: inclua apenas riscos positivamente sustentados por evidência",
                "recommendations: inclua somente ações justificadas por evidência observável",
                "modernization: inclua somente ações justificadas por características observáveis",
                "modernization = []",
                "Prioridade não representa incerteza")) {
            assertTrue(instructions.contains(requirement), requirement);
        }
    }
}
