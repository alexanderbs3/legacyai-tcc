package com.legacyai.file;

import com.legacyai.exception.InvalidFileException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ZipProcessorLimitTest {
    @TempDir
    Path tempDir;

    @Test
    void extractsNormalZipWithinConfiguredLimits() throws Exception {
        Path archive = createZip(List.of(
                new Entry("src/Main.java", "class Main {}"),
                new Entry("README.md", "# Demo")));

        List<Path> extracted = new ZipProcessor(10, 1_024)
                .extractSafely(archive, tempDir.resolve("output"));

        assertEquals(2, extracted.size());
        assertTrue(Files.readString(tempDir.resolve("output/src/Main.java")).contains("class Main"));
    }

    @Test
    void rejectsZipWithMoreEntriesThanConfiguredLimit() throws Exception {
        Path archive = createZip(List.of(
                new Entry("one.txt", "one"),
                new Entry("two.txt", "two"),
                new Entry("three.txt", "three")));

        InvalidFileException error = assertThrows(InvalidFileException.class,
                () -> new ZipProcessor(2, 1_024).extractSafely(archive, tempDir.resolve("output")));

        assertEquals("O arquivo ZIP excede o limite de entradas permitidas.", error.getMessage());
        assertFalse(Files.exists(tempDir.resolve("output/three.txt")));
    }

    @Test
    void rejectsZipWhenExtractedBytesExceedConfiguredLimitBeforeWritingRemainder() throws Exception {
        Path archive = createZip(List.of(
                new Entry("large.txt", "0123456789"),
                new Entry("must-not-be-processed.txt", "later")));

        InvalidFileException error = assertThrows(InvalidFileException.class,
                () -> new ZipProcessor(10, 5).extractSafely(archive, tempDir.resolve("output")));

        assertEquals("O conteúdo descompactado do ZIP excede o limite permitido.", error.getMessage());
        assertFalse(Files.exists(tempDir.resolve("output/large.txt")));
        assertFalse(Files.exists(tempDir.resolve("output/must-not-be-processed.txt")));
    }

    @Test
    void rejectsHighlyExpansibleIgnoredEntryBeforeProcessingFollowingReadme() throws Exception {
        Path archive = createZip(List.of(
                new Entry("node_modules/bomb.dat", "x".repeat(64)),
                new Entry("README.md", "# Demo")));

        InvalidFileException error = assertThrows(InvalidFileException.class,
                () -> new ZipProcessor(10, 20).extractSafely(archive, tempDir.resolve("output")));

        assertEquals("O conteúdo descompactado do ZIP excede o limite permitido.", error.getMessage());
        assertFalse(Files.exists(tempDir.resolve("output/README.md")));
    }

    private Path createZip(List<Entry> entries) throws IOException {
        Path archive = tempDir.resolve("project.zip");
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(archive))) {
            for (Entry entry : entries) {
                zip.putNextEntry(new ZipEntry(entry.name()));
                zip.write(entry.content().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return archive;
    }

    private record Entry(String name, String content) {
    }
}
