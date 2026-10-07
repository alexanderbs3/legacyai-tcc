package com.legacyai.file;

import java.io.IOException;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.legacyai.analysis.ProjectContextBuilder;
import com.legacyai.entity.Project;
import com.legacyai.entity.UploadedFile;
import com.legacyai.exception.InvalidFileException;

@Component
public class FileProcessor {
    private final ZipProcessor zip;

    private final UploadStorage storage;

    private final ProjectContextBuilder builder = new ProjectContextBuilder();

    @Autowired
    public FileProcessor(ZipProcessor zip, UploadStorage storage) {
        this.zip = zip;
        this.storage = storage;
    }

    public String processFiles(Project project, List<UploadedFile> files) throws IOException {
        Path work = Files.createTempDirectory("legacyai-analysis-").toAbsolutePath().normalize();
        try {
            List<Path> selected = new ArrayList<>();
            ZipProcessor.ExtractionBudget zipBudget = zip.newExtractionBudget();
            for (UploadedFile file : files) {
                Path source = storage.resolveStoredPath(file.getTemporaryPath());
                if (file.getFileName().toLowerCase().endsWith(".zip")) {
                    // ZipProcessor validates every entry against the same extraction root before
                    // writing.
                    selected.addAll(zip.extractSafely(source, work, zipBudget));
                } else if (Files.isRegularFile(source)) {
                    Path target = work.resolve(file.getFileName()).normalize();
                    if (!target.startsWith(work)) {
                        throw new SecurityException(
                            "Tentativa de path traversal bloqueada: " + file.getFileName());
                    }
                    Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
                    try {
                        Files.readString(target, StandardCharsets.UTF_8);
                    } catch (MalformedInputException exception) {
                        throw new InvalidFileException(
                            "Arquivo de texto deve estar em UTF-8. Converta o arquivo e tente novamente.");
                    }
                    selected.add(target);
                }
            }
            if (selected.isEmpty()) {
                throw new InvalidFileException(
                    "O upload não contém arquivos de texto UTF-8 processáveis. Extraia o conteúdo de PDFs em TXT/MD ou inclua código-fonte.");
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
