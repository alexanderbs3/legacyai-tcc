package com.legacyai.file;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.legacyai.analysis.ProjectContextBuilder;
import com.legacyai.entity.Project;
import com.legacyai.entity.UploadedFile;
import com.legacyai.exception.InvalidFileException;
import com.legacyai.exception.StorageCleanupException;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectAnalyzerTest {
    @TempDir
    Path tempDir;

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
        try (OutputStream out = Files.newOutputStream(zip);
            ZipOutputStream zos = new ZipOutputStream(out)) {
            zos.putNextEntry(new ZipEntry("../../etc/passwd"));
            zos.write("blocked".getBytes());
            zos.closeEntry();
        }
        assertThrows(
            InvalidFileException.class,
            () -> new ZipProcessor().extractSafely(zip, tempDir.resolve("output")));
    }

    @Test
    void rejectsDirectFileNameThatEscapesProcessingDirectory() throws Exception {
        Path source = tempDir.resolve("source.txt");
        Files.writeString(source, "legacy source");
        UploadedFile file = new UploadedFile(
            UUID.randomUUID(),
            "../../legacyai-path-traversal.txt",
            "text/plain",
            13,
            source.toString());

        assertThrows(
            SecurityException.class,
            () -> processor()
                .processFiles(new Project("Demo", "", UUID.randomUUID()), List.of(file)));
    }

    @Test
    void rejectsPersistedSourcePathOutsideStorageBeforeReadingIt() throws Exception {
        Path outside = Files.createTempFile(tempDir.getParent(), "external-source-", ".txt");
        Files.writeString(outside, "private content");
        UploadedFile file = new UploadedFile(
            UUID.randomUUID(),
            "README.txt",
            "text/plain",
            Files.size(outside),
            outside.toString());

        assertThrows(
            StorageCleanupException.class,
            () -> processor()
                .processFiles(new Project("Demo", "", UUID.randomUUID()), List.of(file)));
    }

    @Test
    void ignoresPdfWithoutNullBytesInsteadOfFailingUtf8Context() throws Exception {
        Path archive = tempDir.resolve("project.zip");
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(archive))) {
            zip.putNextEntry(new ZipEntry("src/Main.java"));
            zip.write("// análise técnica\npublic class Main {}".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("docs/report.pdf"));
            zip.write("%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII));
            zip.write(new byte[]{(byte) 0x80, (byte) 0xFF});
            zip.closeEntry();
        }

        UploadedFile upload = new UploadedFile(
            UUID.randomUUID(),
            "project.zip",
            "application/zip",
            Files.size(archive),
            archive.toString());
        String context = processor()
            .processFiles(new Project("Demo", "", UUID.randomUUID()), List.of(upload));

        assertTrue(context.contains("// análise técnica"));
        assertFalse(context.contains("report.pdf"));
    }

    @Test
    void rejectsPdfOnlyArchiveInsteadOfProducingAnEmptyReport() throws Exception {
        Path archive = tempDir.resolve("pdf-only.zip");
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(archive))) {
            zip.putNextEntry(new ZipEntry("interview.pdf"));
            zip.write("%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII));
            zip.write(new byte[]{(byte) 0x80});
            zip.closeEntry();
        }
        UploadedFile upload = new UploadedFile(
            UUID.randomUUID(),
            "pdf-only.zip",
            "application/zip",
            Files.size(archive),
            archive.toString());

        InvalidFileException error = assertThrows(
            InvalidFileException.class,
            () -> processor()
                .processFiles(new Project("Demo", "", UUID.randomUUID()), List.of(upload)));
        assertTrue(error.getMessage().contains("texto UTF-8"));
    }

    @Test
    void appliesZipUncompressedByteLimitAcrossAllArchivesInOneProcessingRun() throws Exception {
        Path firstArchive = zipWithText("first.zip", "README.md", "123456");
        Path secondArchive = zipWithText("second.zip", "src/Main.java", "abcdef");
        List<UploadedFile> uploads = List
            .of(
                new UploadedFile(
                    UUID.randomUUID(),
                    "first.zip",
                    "application/zip",
                    Files.size(firstArchive),
                    firstArchive.toString()),
                new UploadedFile(
                    UUID.randomUUID(),
                    "second.zip",
                    "application/zip",
                    Files.size(secondArchive),
                    secondArchive.toString()));

        InvalidFileException error = assertThrows(
            InvalidFileException.class,
            () -> new FileProcessor(
                new ZipProcessor(10, 10),
                new UploadStorage(tempDir.toString()))
                .processFiles(new Project("Demo", "", UUID.randomUUID()), uploads));

        assertTrue(error.getMessage().contains("conteúdo descompactado"));
    }

    @Test
    void rejectsNonUtf8DirectTextWithUsefulMessage() throws Exception {
        Path source = tempDir.resolve("invalid.txt");
        Files.write(source, new byte[]{(byte) 0x80});
        UploadedFile upload = new UploadedFile(
            UUID.randomUUID(),
            "invalid.txt",
            "text/plain",
            Files.size(source),
            source.toString());

        InvalidFileException error = assertThrows(
            InvalidFileException.class,
            () -> processor()
                .processFiles(new Project("Demo", "", UUID.randomUUID()), List.of(upload)));
        assertTrue(error.getMessage().contains("UTF-8"));
    }

    private Path zipWithText(String archiveName, String entryName, String content)
        throws Exception {
        Path archive = tempDir.resolve(archiveName);
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(archive))) {
            zip.putNextEntry(new ZipEntry(entryName));
            zip.write(content.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return archive;
    }

    private FileProcessor processor() {
        return new FileProcessor(new ZipProcessor(), new UploadStorage(tempDir.toString()));
    }
}
