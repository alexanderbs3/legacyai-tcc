package com.legacyai.ai;

public record ReportItem(String title, String description, ReportPriority priority) {
    public ReportItem {
        title = title == null ? "" : title;
        description = description == null ? "" : description;
        priority = priority == null ? ReportPriority.MEDIUM : priority;
    }

    public static ReportItem normalized(String title, String description, String priority) {
        return new ReportItem(title, description, ReportPriority.from(priority));
    }
}
