package com.legacyai.file;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

import com.legacyai.exception.InvalidFileException;

@Component
public class ZipProcessor {
    private static final Set<String> IGNORED = Set
        .of(
            ".git",
            "node_modules",
            "target",
            "build",
            "dist",
            ".idea",
            ".vscode");

    private static final int DEFAULT_MAX_ENTRIES = 1_000;

    private static final long DEFAULT_MAX_UNCOMPRESSED_BYTES = 200L * 1024 * 1024;

    private static final String TOO_MANY_ENTRIES = "O arquivo ZIP excede o limite de entradas permitidas.";

    private static final String TOO_MUCH_CONTENT = "O conteúdo descompactado do ZIP excede o limite permitido.";

    private final int maxEntries;

    private final long maxUncompressedBytes;

    @Autowired
    public ZipProcessor(
        @Value("${zip.max-entries:1000}") int maxEntries,
        @Value("${zip.max-uncompressed-bytes:200MB}") DataSize maxUncompressedBytes) {
        this(maxEntries, maxUncompressedBytes.toBytes());
    }

    public ZipProcessor() {
        this(DEFAULT_MAX_ENTRIES, DEFAULT_MAX_UNCOMPRESSED_BYTES);
    }

    public ZipProcessor(int maxEntries, long maxUncompressedBytes) {
        if (maxEntries <= 0 || maxUncompressedBytes <= 0) {
            throw new IllegalArgumentException("Os limites de ZIP devem ser positivos.");
        }
        this.maxEntries = maxEntries;
        this.maxUncompressedBytes = maxUncompressedBytes;
    }

    public List<Path> extractSafely(Path zip, Path directory) throws IOException {
        return extractSafely(zip, directory, newExtractionBudget());
    }

    public ExtractionBudget newExtractionBudget() {
        return new ExtractionBudget(maxUncompressedBytes);
    }

    public List<Path> extractSafely(Path zip, Path directory, ExtractionBudget budget)
        throws IOException {
        List<Path> result = new ArrayList<>();
        Path root = directory.toAbsolutePath().normalize();
        int entries = 0;

        try (ZipInputStream in = new ZipInputStream(Files.newInputStream(zip))) {
            for (ZipEntry entry; (entry = in.getNextEntry()) != null;) {
                if (++entries > maxEntries) {
                    throw new InvalidFileException(TOO_MANY_ENTRIES);
                }

                Path out = root.resolve(entry.getName()).normalize();
                if (!out.startsWith(root)) {
                    throw new InvalidFileException("Caminho ZIP inválido");
                }
                if (entry.isDirectory() || ignored(root.relativize(out))) {
                    discardWithinLimit(in, budget);
                    in.closeEntry();
                    continue;
                }

                Files.createDirectories(out.getParent());
                try {
                    copyWithinLimit(in, out, budget);
                } catch (InvalidFileException exception) {
                    Files.deleteIfExists(out);
                    throw exception;
                }

                if (!binary(out)) {
                    result.add(out);
                } else {
                    Files.deleteIfExists(out);
                }
                in.closeEntry();
            }
        }
        return result;
    }

    private void discardWithinLimit(InputStream input, ExtractionBudget budget) throws IOException {
        byte[] buffer = new byte[8_192];
        for (int read; (read = input.read(buffer)) != -1;) {
            budget.consume(read);
        }
    }

    private void copyWithinLimit(InputStream input, Path output, ExtractionBudget budget)
        throws IOException {
        byte[] buffer = new byte[8_192];
        try (OutputStream out = new BufferedOutputStream(Files.newOutputStream(output))) {
            for (int read; (read = input.read(buffer)) != -1;) {
                budget.consume(read);
                out.write(buffer, 0, read);
            }
        }
    }

    public static final class ExtractionBudget {
        private final long limit;

        private long consumed;

        private ExtractionBudget(long limit) {
            this.limit = limit;
        }

        private void consume(int read) {
            if (read > limit - consumed) {
                throw new InvalidFileException(TOO_MUCH_CONTENT);
            }
            consumed += read;
        }
    }

    private boolean ignored(Path path) {
        for (Path part : path) {
            if (IGNORED.contains(part.toString())) {
                return true;
            }
        }
        return false;
    }

    private boolean binary(Path path) throws IOException {
        try (InputStream in = Files.newInputStream(path)) {
            byte[] bytes = in.readNBytes(4_096);
            for (byte value : bytes) {
                if (value == 0) {
                    return true;
                }
            }
        }
        try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            char[] buffer = new char[4_096];
            while (reader.read(buffer) != -1) {
                // Validate the complete entry without retaining it in memory.
            }
            return false;
        } catch (java.nio.charset.CharacterCodingException exception) {
            return true;
        }
    }
}
