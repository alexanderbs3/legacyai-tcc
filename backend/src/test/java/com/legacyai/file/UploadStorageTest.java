package com.legacyai.file;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.legacyai.exception.StorageCleanupException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class UploadStorageTest {
    @TempDir
    Path root;

    @Test
    void resolvesNormalPathsInsideTheConfiguredRoot() throws Exception {
        Path stored = Files.writeString(root.resolve("upload.tmp"), "content");

        assertEquals(
            stored.toAbsolutePath().normalize(),
            new UploadStorage(root.toString()).resolveStoredPath(stored.toString()));
    }

    @Test
    void rejectsPersistedTraversalAndAbsoluteExternalPaths() throws Exception {
        UploadStorage storage = new UploadStorage(root.toString());
        Path outside = Files.createTempFile(root.getParent(), "outside-", ".tmp");

        assertThrows(
            StorageCleanupException.class,
            () -> storage
                .resolveStoredPath(root.resolve("..").resolve(outside.getFileName()).toString()));
        assertThrows(
            StorageCleanupException.class,
            () -> storage.resolveStoredPath(outside.toString()));
    }
}
