package com.legacyai.file;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.legacyai.exception.StorageCleanupException;

@Component
public class UploadStorage {
    private static final String QUARANTINE_DIRECTORY = ".quarantine";

    private final Path root;

    public UploadStorage(
        @Value("${upload.temp-dir:${java.io.tmpdir}/legacyai-uploads}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    public Path createUploadFile() throws IOException {
        Files.createDirectories(root);
        return Files.createTempFile(root, "upload-", ".tmp");
    }

    public Path resolveStoredPath(String persistedPath) {
        try {
            Path stored = Path.of(persistedPath).toAbsolutePath().normalize();
            if (stored.equals(root) || !stored.startsWith(root)
                || stored.startsWith(root.resolve(QUARANTINE_DIRECTORY))) {
                throw new StorageCleanupException();
            }
            return stored;
        } catch (InvalidPathException | NullPointerException exception) {
            throw new StorageCleanupException();
        }
    }

    public Path createQuarantineDirectory() throws IOException {
        Path quarantineRoot = root.resolve(QUARANTINE_DIRECTORY);
        Files.createDirectories(quarantineRoot);
        return Files.createDirectory(quarantineRoot.resolve(UUID.randomUUID().toString()));
    }

    public void move(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (java.nio.file.AtomicMoveNotSupportedException exception) {
            Files.move(source, target);
        }
    }

    public void removeEmptyQuarantineDirectories(Path quarantineDirectory) throws IOException {
        Files.deleteIfExists(quarantineDirectory);
        Files.deleteIfExists(root.resolve(QUARANTINE_DIRECTORY));
    }
}
