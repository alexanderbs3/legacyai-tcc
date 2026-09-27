package com.legacyai.analysis;

import com.legacyai.ai.ReportItem;
import com.legacyai.ai.ReportPriority;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReportNormalizerTest {
    @Test
    void normalizesUnknownPriorityToMedium() {
        ReportItem item = ReportItem.normalized("SQL injection", "User input is concatenated", "critical");
        assertEquals(ReportPriority.MEDIUM, item.priority());
    }
}
