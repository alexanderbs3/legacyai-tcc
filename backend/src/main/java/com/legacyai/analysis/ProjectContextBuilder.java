package com.legacyai.analysis;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class ProjectContextBuilder {
    private final int max;

    public ProjectContextBuilder() {
        this(12000);
    }

    public ProjectContextBuilder(int max) {
        this.max = max;
    }

    public String build(String project, List<Path> files) throws IOException {
        List<Path> ordered = new ArrayList<>(files);
        ordered.sort(Comparator.comparingInt(this::priority).thenComparing(Path::toString));
        Set<String> languages = new TreeSet<>(), frameworks = new TreeSet<>();
        for (Path p : ordered) {
            String n = p.getFileName().toString().toLowerCase();
            if (n.endsWith(".java"))
                languages.add("Java");
            if (n.endsWith(".js") || n.endsWith(".ts"))
                languages.add("JavaScript/TypeScript");
            String text = Files.readString(p, StandardCharsets.UTF_8);
            if (n.equals("pom.xml") && text.contains("spring-boot"))
                frameworks.add("Spring Boot");
            if (n.equals("package.json") && text.contains("react"))
                frameworks.add("React");
        }
        StringBuilder out = new StringBuilder("PROJECT: ")
            .append(project)
            .append("\nLANGUAGES: ")
            .append(String.join(", ", languages))
            .append("\nFRAMEWORKS: ")
            .append(String.join(", ", frameworks))
            .append("\nIMPORTANT FILES: ")
            .append(ordered.stream().map(p -> p.getFileName().toString()).toList())
            .append("\nSELECTED CONTENT:\n");
        for (Path p : ordered) {
            if (out.length() >= max)
                break;
            String text = Files.readString(p, StandardCharsets.UTF_8);
            int remaining = max - out.length();
            out.append("--- ").append(p.getFileName()).append(" ---\n");
            out.append(text, 0, Math.min(text.length(), Math.max(0, remaining))).append("\n");
        }
        return out.substring(0, Math.min(out.length(), max));
    }

    private int priority(Path p) {
        String n = p.getFileName().toString().toLowerCase();
        if (n.equals("readme") || n.startsWith("readme."))
            return 0;
        if (Set.of("pom.xml", "package.json", "requirements.txt").contains(n))
            return 1;
        if (n.contains("application") || n.endsWith(".properties") || n.endsWith(".yml")
            || n.endsWith(".yaml"))
            return 2;
        return 3;
    }
}
