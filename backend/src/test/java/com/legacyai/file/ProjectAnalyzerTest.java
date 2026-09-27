package com.legacyai.file;

import com.legacyai.analysis.ProjectContextBuilder;
import com.legacyai.entity.Project;
import com.legacyai.entity.UploadedFile;
import com.legacyai.exception.InvalidFileException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectAnalyzerTest {
    @TempDir Path tempDir;

    @Test
    void buildsReadableContextForJavaSpringProject() throws Exception {
        Path pom = tempDir.resolve("pom.xml");
        Path source = tempDir.resolve("Application.java");
        Files.writeString(pom, "<artifactId>spring-boot-starter</artifactId>");
        Files.writeString(source, "public class Application { }");
        String context = new ProjectContextBuilder(1000).build("Demo", List.of(source, pom));
        assertTrue(context.contains("PROJECT: Demo"));
        assertTrue(context.contains("LANGUAGES: Java"));
        assertTrue(context.contains("FRAMEWORKS: Spring Boot"));
        assertTrue(context.indexOf("pom.xml") < context.indexOf("Application.java"));
    }

    @Test
    void rejectsZipSlipEntry() throws Exception {
        Path zip = tempDir.resolve("malicious.zip");
        try (OutputStream out = Files.newOutputStream(zip); ZipOutputStream zos = new ZipOutputStream(out)) {
            zos.putNextEntry(new ZipEntry("../../etc/passwd"));
            zos.write("blocked".getBytes());
            zos.closeEntry();
        }
        assertThrows(InvalidFileException.class, () -> new ZipProcessor().extractSafely(zip, tempDir.resolve("output")));
    }

    @Test
    void rejectsDirectFileNameThatEscapesProcessingDirectory() throws Exception {
        Path source = tempDir.resolve("source.txt");
        Files.writeString(source, "legacy source");
        UploadedFile file = new UploadedFile(UUID.randomUUID(), "../../legacyai-path-traversal.txt", "text/plain", 13, source.toString());

        assertThrows(SecurityException.class, () -> new FileProcessor().processFiles(
                new Project("Demo", "", UUID.randomUUID()), List.of(file)));
    }
}
