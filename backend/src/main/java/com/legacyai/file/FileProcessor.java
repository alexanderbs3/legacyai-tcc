package com.legacyai.file;

import com.legacyai.analysis.ProjectContextBuilder;
import com.legacyai.entity.Project;
import com.legacyai.entity.UploadedFile;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
public class FileProcessor {
    private final ZipProcessor zip = new ZipProcessor();
    private final ProjectContextBuilder builder = new ProjectContextBuilder();

    public String processFiles(Project project, List<UploadedFile> files) throws IOException {
        Path work = Files.createTempDirectory("legacyai-analysis-").toAbsolutePath().normalize();
        try {
            List<Path> selected = new ArrayList<>();
            for (UploadedFile file : files) {
                Path source = Path.of(file.getTemporaryPath());
                if (file.getFileName().toLowerCase().endsWith(".zip")) {
                    // ZipProcessor validates every entry against the same extraction root before writing.
                    selected.addAll(zip.extractSafely(source, work));
                } else if (Files.isRegularFile(source)) {
                    Path target = work.resolve(file.getFileName()).normalize();
                    if (!target.startsWith(work)) {
                        throw new SecurityException("Tentativa de path traversal bloqueada: " + file.getFileName());
                    }
                    Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
                    selected.add(target);
                }
            }
            return builder.build(project.getName(), selected);
        } finally {
            try (var paths = Files.walk(work)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException ignored) {
                    }
                });
            }
        }
    }
}
